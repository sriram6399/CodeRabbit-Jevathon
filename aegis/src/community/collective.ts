export const COLLECTIVE_CALENDAR_URL = "https://lu.ma/genai-collective";

/** Public calendar id for lu.ma/genai-collective. No API key. */
const CALENDAR_ID = "cal-E74MDlDKBaeAwXK";
const ITEMS_URL = `https://api.lu.ma/calendar/get-items?calendar_api_id=${CALENDAR_ID}&period=future&pagination_limit=12`;

export type CollectiveEvent = {
  id: string;
  name: string;
  startAt: string;
  city: string | null;
  url: string;
  hosts: string[];
};

type RawEntry = {
  event?: {
    api_id?: string;
    name?: string;
    start_at?: string;
    url?: string;
    location_type?: string;
    geo_address_info?: { city_state?: string | null };
  };
  hosts?: Array<{ name?: string }>;
};

type Page = {
  entries?: RawEntry[];
  has_more?: boolean;
  next_cursor?: string | null;
};

type Cache = { at: number; events: CollectiveEvent[] };

let cache: Cache | null = null;
const TTL_MS = 60_000;

function asEvent(entry: RawEntry): CollectiveEvent | null {
  const event = entry.event;
  const id = event?.api_id?.trim();
  const name = event?.name?.trim();
  const startAt = event?.start_at?.trim();
  const slug = event?.url?.trim();
  if (!id || !name || !startAt || !slug) return null;
  const city = event?.geo_address_info?.city_state?.trim() || null;
  const hosts = (entry.hosts ?? [])
    .map((host) => host.name?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 4);
  return {
    id,
    name,
    startAt,
    city: city || (event?.location_type === "online" ? "Online" : null),
    url: `https://lu.ma/${slug}`,
    hosts,
  };
}

/**
 * Upcoming events on The AI Collective's public Luma calendar.
 * A failed read returns the last good list when one exists, and never throws.
 */
export async function listCollectiveEvents(): Promise<{ events: CollectiveEvent[]; note: string | null }> {
  const fresh = cache && Date.now() - cache.at < TTL_MS;
  if (fresh && cache) return { events: cache.events, note: null };

  try {
    const events: CollectiveEvent[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 2 && events.length < 12; page += 1) {
      const url = new URL(ITEMS_URL);
      if (cursor) url.searchParams.set("pagination_cursor", cursor);
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Aegis/0.1" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (!response.ok) {
        const note = `The AI Collective calendar returned ${response.status}.`;
        return { events: cache?.events ?? events, note };
      }
      const data = (await response.json()) as Page;
      for (const entry of data.entries ?? []) {
        const event = asEvent(entry);
        if (!event || seen.has(event.id)) continue;
        seen.add(event.id);
        events.push(event);
      }
      cursor = data.has_more && data.next_cursor ? data.next_cursor : null;
      if (!cursor) break;
    }
    events.sort((a, b) => a.startAt.localeCompare(b.startAt));
    const next = events.slice(0, 12);
    cache = { at: Date.now(), events: next };
    return { events: next, note: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "calendar request failed";
    const note = cache
      ? `Showing the last calendar read. ${reason}`
      : `The AI Collective calendar could not be reached. ${reason}`;
    return { events: cache?.events ?? [], note: note.slice(0, 240) };
  }
}
