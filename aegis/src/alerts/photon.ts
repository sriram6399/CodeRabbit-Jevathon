import { Spectrum } from "spectrum-ts";
import { imessage } from "spectrum-ts/providers/imessage";
import type { AlertReceipt } from "@/sdk/types";

export const OPERATOR_EMAIL = "guttikondasriram1234@gmail.com";

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export function alertRecipients(query: string, customerEmail?: string | null) {
  const found = query.match(EMAIL_RE) ?? [];
  const all = [OPERATOR_EMAIL, customerEmail ?? "", ...found]
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(all)];
}

async function connect(projectId: string, projectSecret: string) {
  return Spectrum({
    projectId,
    projectSecret,
    providers: [imessage.config()],
  });
}

type SpectrumApp = Awaited<ReturnType<typeof connect>>;

let connecting: Promise<SpectrumApp> | null = null;

function spectrumApp(projectId: string, projectSecret: string): Promise<SpectrumApp> {
  if (!connecting) {
    connecting = connect(projectId, projectSecret)
      .then((app) => {
        void consume(app);
        return app;
      })
      .catch((error: unknown) => {
        connecting = null;
        throw error;
      });
  }
  return connecting;
}

async function consume(app: SpectrumApp) {
  try {
    for await (const _message of app.messages) {
      // Outbound alerts do not need inbound handling. Draining keeps the socket up.
    }
  } catch {
    connecting = null;
  }
}

/**
 * Photon Spectrum delivers the note to each address as an iMessage handle.
 * Apple routes an iMessage address that is an email to that Apple ID.
 */
export async function sendPhotonMessage(input: {
  recipients: string[];
  subject: string;
  body: string;
}): Promise<AlertReceipt> {
  const text = `${input.subject}\n\n${input.body}`;
  const projectId = process.env.PHOTON_PROJECT_ID?.trim();
  const projectSecret = process.env.PHOTON_PROJECT_SECRET?.trim();

  if (!projectId || !projectSecret) {
    return {
      provider: "photon",
      channel: "imessage-email",
      status: "skipped",
      to: input.recipients,
      subject: input.subject,
      body: text,
      note: "PHOTON_PROJECT_ID and PHOTON_PROJECT_SECRET are not set, so the alert was recorded and not delivered.",
    };
  }

  try {
    const app = await spectrumApp(projectId, projectSecret);
    const im = imessage(app);
    for (const email of input.recipients) {
      const user = await im.user(email);
      const space = await im.space.create(user);
      await space.send(text);
    }
    return {
      provider: "photon",
      channel: "imessage-email",
      status: "sent",
      to: input.recipients,
      subject: input.subject,
      body: text,
      note: `Delivered through Photon Spectrum to ${input.recipients.join(", ")}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Photon send failed";
    return {
      provider: "photon",
      channel: "imessage-email",
      status: "error",
      to: input.recipients,
      subject: input.subject,
      body: text,
      note: message.slice(0, 240),
    };
  }
}

export async function sendDecisionAlert(input: {
  recipients: string[];
  decision: string;
  summary: string;
}): Promise<AlertReceipt> {
  return sendPhotonMessage({
    recipients: input.recipients,
    subject: `Aegis ${input.decision}: loan decision`,
    body: input.summary,
  });
}
