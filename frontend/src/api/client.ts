function resolveApiBase() {
  const override = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '');
  if (override) return override;

  if (typeof window === 'undefined') {
    return 'http://backend:8000';
  }

  const host = window.location.hostname;
  const protocol = window.location.protocol;
  const normalizedHost = host === 'localhost' ? '127.0.0.1' : host;
  return `${protocol}//${normalizedHost}`;
}

const API_BASE = resolveApiBase();

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  if (options?.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const raw = await response.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { detail?: string };
      detail = parsed.detail ?? raw;
    } catch {
      detail = raw;
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
