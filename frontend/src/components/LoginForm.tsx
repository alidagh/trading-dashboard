import { useState, type FormEvent } from 'react'
import { useAuth } from '../auth/auth-context'

const DEMO_USERNAME = 'alidagh'
const DEMO_PASSWORD = 'ali@1234'

export function LoginForm() {
  const { signIn } = useAuth()
  const [username, setUsername] = useState(DEMO_USERNAME)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      await signIn(username, password)
    } catch {
      setError('Wrong username or password')
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Trading Dashboard</h1>
        <p className="login-hint">Sign in to see live prices</p>

        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          autoComplete="username"
          onChange={(event) => setUsername(event.target.value)}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(event) => setPassword(event.target.value)}
        />

        {error && <p className="login-error">{error}</p>}

        <button type="submit" disabled={busy}>
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
