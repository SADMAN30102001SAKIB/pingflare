import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Activity, CheckCircle2, Loader2, RadioTower, ShieldCheck } from 'lucide-react'
import type { AuthPayload } from '../../shared/types'
import { useAuth } from '../auth/auth-context'
import { apiRequest } from '../lib/api'
import { ThemeToggle } from '../theme/theme-context'

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (!auth.loading && auth.user) {
      void navigate({ to: '/app' })
    }
  }, [auth.loading, auth.user, navigate])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = await apiRequest<AuthPayload>(`/api/auth/${mode}`, {
        method: 'POST',
        body: JSON.stringify({ name, email, password }),
      })
      auth.login(payload)
      void navigate({ to: '/app' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="floating-theme-control">
        <ThemeToggle />
      </div>
      <section className="auth-hero">
        <div className="brand-lockup auth-brand">
          <span className="brand-mark">
            <RadioTower size={20} />
          </span>
          <span>
            <strong>PingFlare</strong>
            <small>Uptime monitoring</small>
          </span>
        </div>
        <h1>Monitoring that feels calm when everything is fine and loud when it is not.</h1>
        <p>
          Accounts, monitors, Telegram alerts, response-time history, and public-facing uptime
          pages, split cleanly between Cloudflare Pages and Workers.
        </p>
        <div className="auth-proof-grid">
          <span>
            <CheckCircle2 size={16} />
            Public status pages
          </span>
          <span>
            <Activity size={16} />
            Response history
          </span>
          <span>
            <ShieldCheck size={16} />
            Telegram alerts
          </span>
        </div>
      </section>

      <section className="auth-card">
        <div className="panel-heading">
          <ShieldCheck size={18} />
          <h2>{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
        </div>
        <form className="settings-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'signup' ? (
            <label>
              Name
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
          ) : null}
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
            />
          </label>
          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={16} /> : null}
            {submitting
              ? mode === 'login'
                ? 'Logging in...'
                : 'Creating...'
              : mode === 'login'
                ? 'Login'
                : 'Create account'}
          </button>
          {error ? <p className="error-line">{error}</p> : null}
        </form>
        <p className="muted">
          {mode === 'login' ? 'Need an account?' : 'Already have an account?'}{' '}
          <Link to={mode === 'login' ? '/signup' : '/login'}>
            {mode === 'login' ? 'Sign up' : 'Login'}
          </Link>
        </p>
      </section>
    </main>
  )
}
