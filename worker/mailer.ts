export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface EmailProvider {
  readonly name: "console" | "resend";
  send(message: EmailMessage): Promise<{ status: "logged" | "sent"; id: string }>;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsProvider {
  send(message: SmsMessage): Promise<{ status: "skipped"; reason: string }>;
}

function filled(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function createEmailProvider(env: Env): EmailProvider {
  const key = filled(env.RESEND_API_KEY);
  if (env.EMAIL_PROVIDER === "resend" && key) {
    const from = env.RESEND_FROM;
    return {
      name: "resend",
      async send(message) {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            text: message.text,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
        if (!response.ok) {
          throw new Error(payload.message || `Resend returned ${response.status}`);
        }
        return { status: "sent", id: payload.id || crypto.randomUUID() };
      },
    };
  }

  return {
    name: "console",
    async send(message) {
      console.log(
        JSON.stringify({
          event: "email",
          provider: "console",
          to: message.to,
          subject: message.subject,
          text: message.text,
        }),
      );
      return { status: "logged", id: crypto.randomUUID() };
    },
  };
}

export function createSmsProvider(): SmsProvider {
  return {
    async send(message) {
      const reason = "SMS is not sent. US 10DLC registration is out of scope.";
      console.log(JSON.stringify({ event: "sms_skipped", reason, to: message.to, body: message.body }));
      return { status: "skipped", reason };
    },
  };
}

export function confirmationCopy(input: {
  businessName: string;
  customerName: string;
  when: string;
  address: string;
  total: string;
  paid: string;
  balance: string;
  lines: string[];
}): { subject: string; text: string } {
  return {
    subject: `You're on the schedule with ${input.businessName}`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `${input.businessName} has your carpet cleaning on the books.`,
      input.when,
      input.address,
      "",
      "Quote",
      ...input.lines.map((line) => `- ${line}`),
      "",
      `Total ${input.total}`,
      `Paid ${input.paid}`,
      `Remaining ${input.balance}`,
      "",
      "Reply to this email if you need to move the visit.",
    ].join("\n"),
  };
}

export function depositCopy(input: {
  businessName: string;
  customerName: string;
  amount: string;
  balance: string;
}): { subject: string; text: string } {
  return {
    subject: `Deposit received — ${input.businessName}`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `We received ${input.amount}.`,
      `Remaining balance after the job: ${input.balance}.`,
      "",
      input.businessName,
    ].join("\n"),
  };
}

export function reminderCopy(input: {
  businessName: string;
  customerName: string;
  when: string;
  address: string;
}): { subject: string; text: string } {
  return {
    subject: `Tomorrow: ${input.businessName}`,
    text: [
      `Hi ${input.customerName},`,
      "",
      `Reminder that ${input.businessName} is scheduled for tomorrow.`,
      input.when,
      input.address,
      "",
      "Please clear the floors you want cleaned and tell us about pets or alarm codes.",
    ].join("\n"),
  };
}
