const DEFAULT_TIMEOUT_MS = 12_000;

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export async function getJson(url: URL, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
      cache: "no-cache",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!res.ok) throw new HttpError(`HTTP ${res.status}`, res.status);
    return await res.json();
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new HttpError("timeout");
    }
    throw new HttpError("network");
  } finally {
    clearTimeout(timer);
  }
}

export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
