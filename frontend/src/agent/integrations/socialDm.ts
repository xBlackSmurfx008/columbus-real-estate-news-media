export interface SocialInbound {
  fromHandle: string;
  body: string;
  provider: string;
  providerThreadId: string;
  receivedAt?: string;
}

export interface SocialOutbound {
  toHandle: string;
  body: string;
  provider: string;
  providerThreadId?: string;
}

const socialMailbox = {
  inbound: [] as SocialInbound[],
  outbound: [] as Array<SocialOutbound & { providerMessageId: string; sentAt: string }>,
};

async function sendViaProviderApi(message: SocialOutbound): Promise<{ ok: boolean; providerMessageId: string }> {
  const endpoint = process.env.SOCIAL_DM_API_URL;
  const apiKey = process.env.SOCIAL_DM_API_KEY;
  if (!endpoint || !apiKey) {
    throw new Error("SOCIAL_DM_API_URL and SOCIAL_DM_API_KEY are required for social DM API mode.");
  }

  const response = await fetch(`${endpoint.replace(/\/$/, "")}/messages/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Social DM send failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as { id: string };
  return { ok: true, providerMessageId: payload.id };
}

export const socialDmGateway = {
  async send(message: SocialOutbound): Promise<{ ok: boolean; providerMessageId: string }> {
    if (process.env.SOCIAL_DM_MODE === "api") {
      return sendViaProviderApi(message);
    }

    const providerMessageId = `social_${Date.now()}_${message.toHandle}`;
    socialMailbox.outbound.push({
      ...message,
      providerMessageId,
      sentAt: new Date().toISOString(),
    });
    return { ok: true, providerMessageId };
  },

  async syncInbound(messages: SocialInbound[]): Promise<{ ok: boolean; synced: number }> {
    for (const message of messages) {
      socialMailbox.inbound.push({
        ...message,
        receivedAt: message.receivedAt || new Date().toISOString(),
      });
    }
    return { ok: true, synced: messages.length };
  },

  getSnapshot() {
    return {
      inbound: [...socialMailbox.inbound],
      outbound: [...socialMailbox.outbound],
    };
  },
};
