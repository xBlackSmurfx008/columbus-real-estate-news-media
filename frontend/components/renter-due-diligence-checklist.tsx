"use client";

import { useMemo, useState } from "react";
import { RENTER_DUE_DILIGENCE_SECTIONS } from "@/lib/consumer-insights";
import { trackEvent } from "@/lib/analytics-client";

const STORAGE_KEY = "cren_before_you_sign_checks";

export function RenterDueDiligenceChecklist() {
  const allIds = useMemo(
    () => RENTER_DUE_DILIGENCE_SECTIONS.flatMap((section) => section.items.map((_, index) => `${section.id}-${index}`)),
    [],
  );
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);

  const total = allIds.length;
  const done = allIds.filter((id) => checked.has(id)).length;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Ignore storage failures.
      }

      if (!started) {
        setStarted(true);
        trackEvent("renter_checklist_start", { checklist: "before-you-sign" });
      }

      const nextDone = allIds.filter((checkId) => next.has(checkId)).length;
      if (nextDone === total && !completed) {
        setCompleted(true);
        trackEvent("renter_checklist_complete", { checklist: "before-you-sign", conversion: true });
      } else if (nextDone < total && completed) {
        setCompleted(false);
      }

      return next;
    });
  }

  return (
    <section className="cren-stack" data-section-id="before-you-sign-checklist">
      <div className="cren-soft p-5 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-eyebrow">Checklist progress</div>
            <h2 className="cren-heading-md">{done} of {total} checks reviewed</h2>
          </div>
          <div className="font-[family-name:var(--mono)] text-2xl font-semibold text-[color:var(--green)]">{percent}%</div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-[color:var(--border)]" aria-hidden="true">
          <div className="h-full rounded-full bg-[color:var(--green)] transition-all" style={{ width: `${percent}%` }} />
        </div>
        {completed && (
          <p className="cren-body mt-3 text-sm">
            You reviewed the full checklist. Save the lease, fee sheet, photos, public-record notes, and written answers before sending money.
          </p>
        )}
      </div>

      {RENTER_DUE_DILIGENCE_SECTIONS.map((section) => (
        <section key={section.id} className="cren-surface p-5 md:p-6">
          <h3 className="cren-heading-md">{section.title}</h3>
          <p className="cren-body mt-1 text-sm">{section.description}</p>
          <div className="mt-4 grid gap-3">
            {section.items.map((item, index) => {
              const id = `${section.id}-${index}`;
              return (
                <label key={id} className="flex items-start gap-3 rounded-[var(--radius-sm)] border border-[color:var(--border)] bg-[color:var(--bg)] p-4 text-sm text-[color:var(--text-secondary)]">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={checked.has(id)}
                    onChange={() => toggle(id)}
                  />
                  <span>{item}</span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
