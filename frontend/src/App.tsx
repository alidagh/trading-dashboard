import { useAuth } from './auth/auth-context'
import { Dashboard } from './components/Dashboard'
import { LoginForm } from './components/LoginForm'
import './App.css'

function App() {
  const { user } = useAuth()

  return user ? <Dashboard /> : <LoginForm />
}

export default App
