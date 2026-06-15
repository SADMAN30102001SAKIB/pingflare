export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787'

export async function apiRequest<T>(
  path: string,
  options?: RequestInit,
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options?.headers ?? {})
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Request failed with HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}
