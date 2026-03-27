export interface EmailInbound {
  providerMessageId?: string;
  from: string;
  subject: string;
  body: string;
  receivedAt?: string;
}

export interface EmailOutbound {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

const mailbox = {
  inbox: [] as EmailInbound[],
  outbox: [] as Array<EmailOutbound & { providerMessageId: string; sentAt: string }>,
};

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildRawMessage(message: EmailOutbound): string {
  return [
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "MIME-Version: 1.0",
    "",
    message.body,
  ].join("\r\n");
}

async function sendViaGmailApi(message: EmailOutbound): Promise<{ ok: boolean; providerMessageId: string }> {
  const accessToken = process.env.GOOGLE_GMAIL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("GOOGLE_GMAIL_ACCESS_TOKEN is required when GOOGLE_GMAIL_MODE=api.");
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: toBase64Url(buildRawMessage(message)),
      threadId: message.threadId,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gmail send failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return { ok: true, providerMessageId: payload.id };
}

// Provider abstraction. Defaults to staged mode and supports Gmail API mode.
export const emailGateway = {
  async send(message: EmailOutbound): Promise<{ ok: boolean; providerMessageId: string }> {
    if (process.env.GOOGLE_GMAIL_MODE === "api") {
      return sendViaGmailApi(message);
    }

    const providerMessageId = `staged_${Date.now()}_${message.to}`;
    mailbox.outbox.push({
      ...message,
      providerMessageId,
      sentAt: new Date().toISOString(),
    });
    return {
      ok: true,
      providerMessageId,
    };
  },

  async syncInbox(messages: EmailInbound[]): Promise<{ ok: boolean; synced: number }> {
    for (const message of messages) {
      mailbox.inbox.push({
        ...message,
        providerMessageId: message.providerMessageId || `inbound_${Date.now()}_${message.from}`,
        receivedAt: message.receivedAt || new Date().toISOString(),
      });
    }
    return { ok: true, synced: messages.length };
  },

  getMailboxSnapshot() {
    return {
      inbox: [...mailbox.inbox],
      outbox: [...mailbox.outbox],
    };
  },
};
