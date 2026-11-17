import { formatUsd } from "../src/shared/money";
import { formatLongDate, formatMinutes } from "../src/shared/time";
import type { Business, Job } from "./data";
import { insertNotice } from "./data";
import {
  confirmationCopy,
  createEmailProvider,
  createSmsProvider,
  depositCopy,
  reminderCopy,
  type EmailMessage,
} from "./mailer";

function lineLabel(job: Job): string[] {
  return job.quote.lines.map((line) => `${line.qty} × ${line.label} — ${formatUsd(line.totalCents)}`);
}

export function whenLabel(job: Job): string {
  const date = job.startsAt.slice(0, 10);
  const minutes = Number(job.startsAt.slice(11, 13)) * 60 + Number(job.startsAt.slice(14, 16));
  return `${formatLongDate(date)} at ${formatMinutes(minutes)}`;
}

export function addressLabel(job: Job): string {
  return [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
}

async function record(
  env: Env,
  input: {
    businessId: string;
    jobId: string;
    channel: "email" | "sms";
    kind: string;
    to: string;
    subject: string | null;
    body: string;
    status: string;
  },
) {
  await insertNotice(env.DB, {
    id: crypto.randomUUID(),
    businessId: input.businessId,
    jobId: input.jobId,
    channel: input.channel,
    kind: input.kind,
    toAddress: input.to,
    subject: input.subject,
    body: input.body,
    status: input.status,
    createdAt: new Date().toISOString(),
  });
}

async function sendEmail(env: Env, businessId: string, jobId: string, kind: string, message: EmailMessage) {
  const provider = createEmailProvider(env);
  try {
    const result = await provider.send(message);
    await record(env, { businessId, jobId, channel: "email", kind, to: message.to, subject: message.subject, body: message.text, status: result.status });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Email failed";
    console.log(JSON.stringify({ level: "error", event: "email_failed", detail }));
    await record(env, {
      businessId,
      jobId,
      channel: "email",
      kind,
      to: message.to,
      subject: message.subject,
      body: `${message.text}\n\nDelivery error: ${detail}`,
      status: "failed",
    });
  }
}

async function sendSms(env: Env, businessId: string, jobId: string, kind: string, to: string | null | undefined, body: string) {
  if (!to) return;
  const result = await createSmsProvider().send({ to, body });
  await record(env, { businessId, jobId, channel: "sms", kind, to, subject: null, body: `${body}\n\n${result.reason}`, status: result.status });
}

export async function sendBookingNotice(env: Env, business: Business, job: Job, payUrl: string) {
  const customerName = job.customerName || "there";
  const copy = confirmationCopy({
    businessName: business.name,
    customerName,
    when: whenLabel(job),
    address: addressLabel(job),
    total: formatUsd(job.totalCents),
    paid: formatUsd(job.paidCents),
    balance: formatUsd(job.totalCents - job.paidCents),
    lines: lineLabel(job),
  });
  const text = job.paidCents > 0 ? copy.text : `${copy.text}\n\nDeposit link: ${payUrl}`;
  if (job.customerEmail) {
    await sendEmail(env, business.id, job.id, "confirmation", { to: job.customerEmail, subject: copy.subject, text });
  }
  await sendSms(env, business.id, job.id, "confirmation", job.customerPhone, `${business.name}: booked ${whenLabel(job)}. ${payUrl}`);
}

export async function sendDepositNotice(env: Env, business: Business, job: Job, amountCents: number) {
  const copy = depositCopy({
    businessName: business.name,
    customerName: job.customerName || "there",
    amount: formatUsd(amountCents),
    balance: formatUsd(Math.max(0, job.totalCents - job.paidCents)),
  });
  if (job.customerEmail) {
    await sendEmail(env, business.id, job.id, "deposit", { to: job.customerEmail, subject: copy.subject, text: copy.text });
  }
}

export async function sendReminderNotice(env: Env, businessName: string, businessId: string, job: Job) {
  const copy = reminderCopy({
    businessName,
    customerName: job.customerName || "there",
    when: whenLabel(job),
    address: addressLabel(job),
  });
  if (job.customerEmail) {
    await sendEmail(env, businessId, job.id, "reminder", { to: job.customerEmail, subject: copy.subject, text: copy.text });
  }
  await sendSms(env, businessId, job.id, "reminder", job.customerPhone, `${businessName} tomorrow: ${whenLabel(job)}.`);
}
