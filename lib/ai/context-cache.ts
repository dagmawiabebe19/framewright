const TTL_MS = 60_000;
const store = new Map<string, { at: number; payload: string }>();

export function aiContextCacheKey(
  userId: string,
  showId: string,
  episodeId: string | null | undefined,
  context: string
) {
  return `${userId}:${showId}:${episodeId ?? ""}:${context}`;
}

export function getCachedAiContext(key: string): string | null {
  const row = store.get(key);
  if (!row) return null;
  if (Date.now() - row.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return row.payload;
}

export function setCachedAiContext(key: string, payload: string) {
  store.set(key, { at: Date.now(), payload });
}
