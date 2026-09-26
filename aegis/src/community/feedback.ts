import { OPERATOR_EMAIL, sendPhotonMessage } from "@/alerts/photon";
import { COLLECTIVE_CALENDAR_URL, listCollectiveEvents, type CollectiveEvent } from "@/community/collective";
import { latestFeedback, saveFeedback, type FeedbackRow } from "@/platform/store";

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

export type FeedbackInput = {
  name: string;
  email: string;
  eventId: string | null;
  rating: number;
  message: string;
};

export function parseFeedback(body: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string } {
  const raw = body as {
    name?: unknown;
    email?: unknown;
    eventId?: unknown;
    rating?: unknown;
    message?: unknown;
  } | null;
  const name = typeof raw?.name === "string" ? raw.name.trim() : "";
  const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
  const message = typeof raw?.message === "string" ? raw.message.trim() : "";
  const eventId = typeof raw?.eventId === "string" && raw.eventId.trim() ? raw.eventId.trim() : null;
  const rating = typeof raw?.rating === "number" ? raw.rating : Number(raw?.rating);

  if (name.length < 1 || name.length > 80) return { ok: false, error: "A name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "An email is required." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Choose a rating from 1 to 5." };
  }
  if (message.length < 12 || message.length > 800) {
    return { ok: false, error: "Write a note between 12 and 800 characters." };
  }
  return { ok: true, value: { name, email, eventId, rating, message } };
}

function noteBody(input: FeedbackInput, event: CollectiveEvent | null) {
  const where = event ? `${event.name}\n${event.url}` : "No event selected";
  return [`${input.name} rated ${input.rating}/5.`, where, "", input.message, "", `From ${input.email}`].join("\n");
}

/**
 * Files a note against a live AI Collective event and sends a Photon copy to the operator.
 * The submitter's address is stored. It is not used as an iMessage recipient.
 */
export async function fileFeedback(
  input: FeedbackInput,
): Promise<{ ok: true; feedback: FeedbackRow } | { ok: false; error: string }> {
  const calendar = await listCollectiveEvents();
  let event: CollectiveEvent | null = null;
  if (input.eventId) {
    event = calendar.events.find((item) => item.id === input.eventId) ?? null;
    if (!event) {
      return {
        ok: false,
        error: calendar.note ?? "That event is not on the current AI Collective calendar. Pick another.",
      };
    }
  }

  const receipt = await sendPhotonMessage({
    recipients: [OPERATOR_EMAIL],
    subject: "Aegis feedback for The AI Collective",
    body: noteBody(input, event),
  });
  const status = receipt.status === "sent" ? "sent" : receipt.status === "error" ? "error" : "stored";
  const feedback = saveFeedback({
    name: input.name,
    email: input.email,
    eventId: event?.id ?? null,
    eventName: event?.name ?? null,
    eventUrl: event?.url ?? null,
    rating: input.rating,
    message: input.message,
    status,
    note: receipt.note,
  });
  return { ok: true, feedback };
}

export async function communityBoard() {
  const calendar = await listCollectiveEvents();
  return {
    provider: "aicollective" as const,
    calendarUrl: COLLECTIVE_CALENDAR_URL,
    calendarName: "The AI Collective",
    events: calendar.events,
    note: calendar.note,
    recent: latestFeedback(),
    photon: Boolean(process.env.PHOTON_PROJECT_ID?.trim() && process.env.PHOTON_PROJECT_SECRET?.trim()),
  };
}
