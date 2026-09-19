const API_BASE = 'http://localhost:8001';

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Request failed');
  }
  return response.json() as Promise<T>;
}
