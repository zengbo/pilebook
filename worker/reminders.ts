import { addDays, inReminderWindow, zonedLocalToUtc } from "../src/shared/time";
import { reminderCandidates, saveJobStatus } from "./data";
import { sendReminderNotice } from "./notify";

export async function runReminders(env: Env, now = new Date()): Promise<{ sent: number }> {
  const today = now.toISOString().slice(0, 10);
  const candidates = await reminderCandidates(env.DB, `${addDays(today, -1)}T00:00`, `${addDays(today, 3)}T23:59`);
  let sent = 0;
  for (const job of candidates) {
    let startUtc: Date;
    try {
      startUtc = zonedLocalToUtc(job.startsAt, job.timezone);
    } catch {
      continue;
    }
    if (!inReminderWindow(now, startUtc)) continue;
    await sendReminderNotice(env, job.businessName, job.businessId, job);
    await saveJobStatus(env.DB, job.businessId, job.id, { reminderSentAt: now.toISOString() });
    sent += 1;
  }
  console.log(JSON.stringify({ event: "reminders", sent, scanned: candidates.length }));
  return { sent };
}
