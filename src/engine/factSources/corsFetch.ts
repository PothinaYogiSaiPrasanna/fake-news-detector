const CORS_PROXIES = [
  (url: string) => `https://proxy.cors.sh/${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.org/?${encodeURIComponent(url)}`,
];

export async function corsFetch(url: string, timeoutMs = 6000): Promise<string | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) continue;
      return await res.text();
    } catch {
      continue;
    }
  }
  return null;
}

export async function corsFetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
  const text = await corsFetch(url, timeoutMs);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
