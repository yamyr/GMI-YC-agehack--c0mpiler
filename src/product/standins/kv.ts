/** The slice of `localStorage` the stand-ins use, so tests can pass an in-memory one. */
export interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function memory(): KeyValue {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/** Reads a JSON document, treating anything unreadable as absent rather than failing. */
export function readJson<T>(kv: KeyValue, key: string, fallback: T): T {
  const raw = kv.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(kv: KeyValue, key: string, value: unknown): void {
  kv.setItem(key, JSON.stringify(value));
}
