/**
 * SLA sweep: the thing that makes the one-business-day promise real.
 *
 * Runs on a schedule (Vercel cron -> /api/cron/lead-sla, or the daily cloud
 * routine -> scripts/lead-sla-sweep.mjs). For every open, non-test inquiry it:
 *
 *   1. reconciles any source row missing a queue entry (invariant repair),
 *   2. alerts BEFORE the deadline (`due_soon`, two business hours out),
 *   3. alerts again if a deadline passes unanswered (`breached`),
 *   4. records every alert in `inquiry_alerts` whether or not Telegram exists.
 *
 * Alert delivery is layered so it degrades gracefully:
 *   - Telegram when TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID are set;
 *   - otherwise the alert row is stored with delivery='logged_only' and shown
 *     as an unacknowledged banner on /admin/queue, plus a structured
 *     console.error line for log-based monitoring.
 * Nothing about the queue depends on a secret existing.
 *
 * Only relative imports here so plain node scripts can load this file with
 * --experimental-strip-types.
 */

import {
  alertKey,
  formatSlaAlert,
  slaSnapshot,
  type AlertKind,
  type QueueAlertRow,
} from "./inquiry-queue.ts";
import { reconcileQueue } from "./inquiry-queue-db.ts";

type SqlClient = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<Record<string, unknown>[]>;
  query: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
};

export type AlertDelivery = "telegram" | "logged_only" | "failed";

export interface SweepResult {
  ranAt: string;
  reconciled: number;
  openReal: number;
  dueSoon: number;
  breached: number;
  alertsRaised: number;
  delivery: AlertDelivery | "none";
  deliveryError: string | null;
  /** Alerts that reached only the durable log, awaiting a human in /admin/queue. */
  pendingAcknowledgement: number;
  notes: string[];
}

async function deliverTelegram(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return { ok: false, error: "TELEGRAM_NOT_CONFIGURED" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    return response.ok ? { ok: true } : { ok: false, error: `TELEGRAM_HTTP_${response.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message.slice(0, 200) : "TELEGRAM_DELIVERY_FAILED" };
  } finally {
    clearTimeout(timer);
  }
}

async function recordAlert(
  sql: SqlClient,
  row: QueueAlertRow,
  kind: AlertKind,
  message: string,
): Promise<boolean> {
  const key = alertKey(row, kind);
  const inserted = await sql`
    INSERT INTO inquiry_alerts (alert_key, kind, queue_id, message, delivery)
    VALUES (${key}, ${kind}, ${Number(row.id)}, ${message}, 'pending')
    ON CONFLICT (alert_key) DO NOTHING
    RETURNING id
  `;
  return inserted.length > 0;
}

async function markDelivery(sql: SqlClient, keys: string[], delivery: AlertDelivery, error: string | null) {
  if (keys.length === 0) return;
  await sql`
    UPDATE inquiry_alerts
    SET delivery = ${delivery}, delivery_error = ${error}
    WHERE alert_key = ANY(${keys}::text[])
  `;
}

/**
 * Run one sweep. `now` is injectable so the behaviour is testable and so a
 * dry run can be evaluated against a fixed clock.
 */
export async function runSlaSweep(
  sql: SqlClient,
  options: { now?: Date; dryRun?: boolean } = {},
): Promise<SweepResult> {
  const now = options.now ?? new Date();
  const notes: string[] = [];

  const reconciliation = await reconcileQueue(sql);
  if (reconciliation.added > 0) {
    notes.push(`reconciled ${reconciliation.added} inquiry(s) that had no queue entry: ${reconciliation.details.slice(0, 10).join(", ")}`);
  }

  // Only real, unanswered, still-open inquiries can raise an alert. Test rows
  // are excluded by construction, not by after-the-fact filtering.
  const open = (await sql`
    SELECT id, inquiry_type, name, email, owner_key, received_at, sla_due_at, sla_warn_at, alert_state
    FROM inquiry_queue
    WHERE is_test = false
      AND first_response_at IS NULL
      AND status IN ('new', 'working')
    ORDER BY sla_due_at ASC
    LIMIT 500
  `) as unknown as (QueueAlertRow & { sla_warn_at: string; alert_state: string })[];

  const dueSoon: QueueAlertRow[] = [];
  const breached: QueueAlertRow[] = [];
  for (const row of open) {
    const snapshot = slaSnapshot(row, now);
    if (snapshot.state === "breached") breached.push(row);
    else if (snapshot.state === "due_soon") dueSoon.push(row);
  }

  const newAlerts: { kind: AlertKind; rows: QueueAlertRow[] }[] = [];
  const newKeys: string[] = [];

  if (!options.dryRun) {
    const freshDueSoon: QueueAlertRow[] = [];
    for (const row of dueSoon) {
      const message = formatSlaAlert("due_soon", [row], now);
      if (await recordAlert(sql, row, "due_soon", message)) {
        freshDueSoon.push(row);
        newKeys.push(alertKey(row, "due_soon"));
        await sql`UPDATE inquiry_queue SET alert_state = 'warned', last_alert_at = NOW(), updated_at = NOW() WHERE id = ${Number(row.id)}`;
      }
    }
    if (freshDueSoon.length > 0) newAlerts.push({ kind: "due_soon", rows: freshDueSoon });

    const freshBreached: QueueAlertRow[] = [];
    for (const row of breached) {
      const message = formatSlaAlert("breached", [row], now);
      if (await recordAlert(sql, row, "breached", message)) {
        freshBreached.push(row);
        newKeys.push(alertKey(row, "breached"));
        await sql`UPDATE inquiry_queue SET alert_state = 'breach_alerted', last_alert_at = NOW(), updated_at = NOW() WHERE id = ${Number(row.id)}`;
      }
    }
    if (freshBreached.length > 0) newAlerts.push({ kind: "breached", rows: freshBreached });
  }

  let delivery: AlertDelivery | "none" = "none";
  let deliveryError: string | null = null;
  if (newAlerts.length > 0) {
    const text = newAlerts.map(({ kind, rows }) => formatSlaAlert(kind, rows, now)).join("\n\n");
    const sent = await deliverTelegram(text);
    if (sent.ok) {
      delivery = "telegram";
    } else if (sent.error === "TELEGRAM_NOT_CONFIGURED") {
      delivery = "logged_only";
      deliveryError = sent.error;
      notes.push("Telegram is not configured; alerts were written to inquiry_alerts and surface on /admin/queue.");
    } else {
      delivery = "failed";
      deliveryError = sent.error ?? "UNKNOWN";
      notes.push(`Telegram delivery failed (${deliveryError}); alerts remain unacknowledged on /admin/queue.`);
    }
    // Telegram-delivered alerts still need an operator to act, so acknowledgement
    // is only auto-set for the delivered channel, never for logged-only ones.
    await markDelivery(sql, newKeys, delivery, deliveryError);
    console[delivery === "telegram" ? "info" : "error"]("CREN_INQUIRY_SLA_ALERT", {
      delivery,
      deliveryError,
      alerts: newAlerts.reduce((sum, group) => sum + group.rows.length, 0),
      text: text.slice(0, 1_500),
    });
  }

  const pending = await sql`
    SELECT COUNT(*)::int AS n FROM inquiry_alerts WHERE acknowledged_at IS NULL
  `;

  return {
    ranAt: now.toISOString(),
    reconciled: reconciliation.added,
    openReal: open.length,
    dueSoon: dueSoon.length,
    breached: breached.length,
    alertsRaised: newKeys.length,
    delivery,
    deliveryError,
    pendingAcknowledgement: Number(pending[0]?.n ?? 0),
    notes,
  };
}
