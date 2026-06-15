import * as React from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LayoutDashboard, LogOut, Plus, RadioTower, UserCircle } from 'lucide-react'
import { useAuth } from '../auth/auth-context'
import { ThemeToggle } from '../theme/theme-context'

export function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = React.useState(false)

  React.useEffect(() => {
    if (!auth.loading && !auth.user) {
      void navigate({ to: '/login' })
    }
  }, [auth.loading, auth.user, navigate])

  if (auth.loading || !auth.user) {
    return <div className="center-panel">Loading account...</div>
  }

  return (
    <main className="app-shell">
      <aside className="app-sidebar">
        <Link className="brand-lockup" to="/app" aria-label="PingFlare dashboard">
          <span className="brand-mark">
            <RadioTower size={20} />
          </span>
          <span>
            <strong>PingFlare</strong>
            <small>Uptime monitoring</small>
          </span>
        </Link>

        <nav className="sidebar-nav" aria-label="Workspace navigation">
          <Link to="/app" activeProps={{ className: 'active' }}>
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
          <Link to="/app/monitors/new" activeProps={{ className: 'active' }}>
            <Plus size={18} />
            Add monitor
          </Link>
        </nav>

        <div className="sidebar-account">
          <UserCircle size={20} />
          <span>
            <strong>{auth.user.name}</strong>
            <small>{auth.user.email}</small>
          </span>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Monitor operations</p>
            <h1 className="workspace-title">Dashboard</h1>
          </div>
          <div className="workspace-actions">
            <ThemeToggle />
            <button
              className="ghost-button"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true)
                void auth.logout().then(() => navigate({ to: '/login' }))
              }}
            >
              <LogOut size={16} />
              {loggingOut ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </header>
        <Outlet />
      </section>
    </main>
  )
}
