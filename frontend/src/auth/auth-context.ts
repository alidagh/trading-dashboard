import { createContext, useContext } from 'react'
import type { AuthUser } from '@trading-dashboard/contracts'

export type AuthState = {
  user: AuthUser | null
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth() {
  const auth = useContext(AuthContext)

  if (!auth) {
    throw new Error('useAuth needs an AuthProvider above it')
  }

  return auth
}
