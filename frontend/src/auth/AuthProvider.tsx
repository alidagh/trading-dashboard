import { useMemo, useState, type ReactNode } from 'react'
import type { AuthUser } from '@trading-dashboard/contracts'
import { login } from '../api/auth'
import { clearSession, readSession, saveSession } from '../api/session'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(
    () => readSession()?.user ?? null,
  )

  const auth = useMemo(
    () => ({
      user,
      async signIn(username: string, password: string) {
        const session = await login(username, password)
        saveSession(session)
        setUser(session.user)
      },
      signOut() {
        clearSession()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}
