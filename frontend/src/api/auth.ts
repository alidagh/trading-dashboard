import type { LoginResponse } from '@trading-dashboard/contracts'
import { api } from './client'

export async function login(username: string, password: string) {
  const { data: session } = await api.post<LoginResponse>('/auth/login', {
    username,
    password,
  })

  return session
}
