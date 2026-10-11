/**
 * Next dev/Turbopack can return an empty body for an in-flight request when a
 * route recompiles mid-request, which makes a plain `res.json()` throw
 * "Unexpected end of JSON input". Parse defensively and hand back `null`
 * instead, so callers can fall back to an empty/previous value.
 */
export async function parseJson<T = unknown>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchJson<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<T | null> {
  const res = await fetch(input, init);
  return parseJson<T>(res);
}
