import type { AuthUser } from '@trading-dashboard/contracts'

const STORAGE_KEY = 'trading-dashboard.session'

export type Session = {
  token: string
  user: AuthUser
}

// Kept outside React so the axios interceptor and the socket hook can both reach the token
let current: Session | null = null

export function readSession(): Session | null {
  if (current) {
    return current
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return null
  }

  try {
    current = JSON.parse(stored) as Session
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }

  return current
}

export function saveSession(session: Session) {
  current = session
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  current = null
  localStorage.removeItem(STORAGE_KEY)
}

export function getToken() {
  return readSession()?.token
}
