/**
 * API client for Vision Guard backend.
 * Base URL is read from VITE_API_BASE_URL (see .env.example).
 * When unset or empty, use mock data instead of calling the API.
 */

const rawBase = (import.meta.env.VITE_API_BASE_URL as string)?.trim() || ''
const baseUrl = rawBase && !rawBase.endsWith('/') ? `${rawBase}/` : rawBase

export function getApiBaseUrl(): string {
  return rawBase
}

export function isApiConfigured(): boolean {
  return rawBase.length > 0
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...init } = options
  const pathNormalized = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(pathNormalized, baseUrl)
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  }
  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

export async function apiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  if (!isApiConfigured()) {
    throw new Error('VITE_API_BASE_URL is not set. Use mock data or configure the API.')
  }
  return request<T>(path, { ...options, method: 'GET' })
}
