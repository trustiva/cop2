import { env } from './env'
import { supabase } from './supabase'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let detail = response.statusText
    try {
      const errBody = (await response.json()) as { detail?: string }
      if (typeof errBody?.detail === 'string' && errBody.detail) {
        detail = errBody.detail
      }
    } catch {
      // Non-JSON error body
    }
    throw new ApiError(
      response.status,
      detail ? `${response.status}: ${detail}` : `HTTP ${response.status} error`,
    )
  }

  if (response.status === 204) {
    return undefined as unknown as T
  }

  return (await response.json()) as T
}
