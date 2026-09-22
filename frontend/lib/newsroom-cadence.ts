import { addDays, easternToday, NEWSROOM_TIMEZONE } from './coverage-calendar.ts';
import { enqueueAgentJob, type SqlClient } from '../src/agent/repositories/jobs.ts';

/** These jobs produce operational assignment reports, NOT completed stories or sends. */
export const CADENCE_VERSION = 'cren-cadence-v1';
export const CADENCE_RULES = [
  { id: 'opening-check', minute: 345, frequency: 'daily', tasks: ['Check source, provider, run, queue and budget readiness; pause affected lanes.'] },
  { id: 'news-event-scout', minute: 360, frequency: 'daily', tasks: ['Scan primary sources and organizer pages across area coverage gaps.', 'Create evidence-backed assignments; zero qualifying stories is a valid result.'] },
  { id: 'editorial-desk', minute: 420, frequency: 'daily', tasks: ['Report and independently edit up to two justified stories.', 'Queue versioned owner proofs; corrections revoke prior approval.'] },
  { id: 'event-recheck-am', minute: 660, frequency: 'daily', tasks: ['Recheck imminent events, cancellations and public-record deadlines against organizer sources.'] },
  { id: 'event-recheck-pm', minute: 960, frequency: 'daily', tasks: ['Recheck changed events; escalate urgent corrections without publishing unapproved copy.'] },
  { id: 'owner-digest', minute: 1020, frequency: 'daily', tasks: ['Summarize staged work, missing runs, review replies, overdue verified inquiries and dead letters.', 'Separate media and acquisition pipelines; distinguish booked value from collected cash.'] },
  { id: 'weekly-planning', minute: 540, frequency: 'weekly', weekday: 1, tasks: ['Review area coverage gaps, qualified pipeline movement and at most three commercial priorities.'] },
  { id: 'outreach-review', minute: 600, frequency: 'weekly', weekday: 3, tasks: ['Prepare a researched, provenance-linked outreach batch for approval; do not send.', 'Honor reply, bounce, complaint, suppression and attempt-limit stops.'] },
  { id: 'weekend-planner', minute: 600, frequency: 'weekly', weekday: 4, tasks: ['Prepare an area-filtered Weekend Planner from current organizer records and approved stories for owner review.'] },
  { id: 'weekly-scorecard', minute: 900, frequency: 'weekly', weekday: 5, tasks: ['Review audience, member accounts, qualified leads, commercial collections and editorial quality.', 'Prepare a weekly digest; distribution requires exact-version approval and suppression checks.'] },
  { id: 'monthly-audit', minute: 600, frequency: 'monthly', tasks: ['Reconcile source coverage, rights, retention, actual cash, costs and reliability exercises.', 'Check named market-source releases; do not invent missing periods or numbers.'] },
] as const;

function localMinute(now: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: NEWSROOM_TIMEZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  return Number(parts.find((part) => part.type === 'hour')?.value) * 60 + Number(parts.find((part) => part.type === 'minute')?.value);
}

/** Bounded recovery: today's due reports plus yesterday's, with stable period keys. */
export function planNewsroomCadence(now = new Date(), catchUpDays = 1) {
  if (!Number.isFinite(now.getTime()) || !Number.isInteger(catchUpDays) || catchUpDays < 0 || catchUpDays > 2) throw new Error('INVALID_CADENCE_WINDOW');
  const today = easternToday(now);
  const jobs = [];
  for (let offset = catchUpDays; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    for (const rule of CADENCE_RULES) {
      if (offset === 0 && localMinute(now) < rule.minute) continue;
      if (rule.frequency === 'weekly' && weekday !== rule.weekday) continue;
      if (rule.frequency === 'monthly' && !date.endsWith('-01')) continue;
      jobs.push({
        kind: 'operations.scheduled_review',
        dedupeKey: `${CADENCE_VERSION}:${rule.id}:${date}`,
        ownerRole: 'operations',
        payload: {
          workflowVersion: CADENCE_VERSION, cadence: rule.frequency, scheduleId: rule.id,
          localDate: date, timezone: NEWSROOM_TIMEZONE, scheduledMinute: rule.minute,
          tasks: [...rule.tasks], authority: 'REVIEW_ONLY',
          completionMeaning: 'Operational assignment report only; deliverables require separate execution evidence.',
        },
      });
    }
  }
  return jobs;
}

export async function enqueueNewsroomCadence(sql: SqlClient, now = new Date()) {
  const planned = planNewsroomCadence(now);
  const jobs = [];
  for (const input of planned) jobs.push(await enqueueAgentJob(sql, input));
  return jobs;
}
