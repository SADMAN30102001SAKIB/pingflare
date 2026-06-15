import * as React from 'react'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { LogOut, RadioTower } from 'lucide-react'
import { useAuth } from '../auth/auth-context'

export function AppLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!auth.loading && !auth.user) {
      void navigate({ to: '/login' })
    }
  }, [auth.loading, auth.user, navigate])

  if (auth.loading || !auth.user) {
    return <div className="center-panel">Loading account...</div>
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <div className="eyebrow warm">
            <RadioTower size={16} />
            PingFlare
          </div>
          <h1 className="workspace-title">Monitor operations</h1>
        </div>
        <div className="workspace-actions">
          <span>{auth.user.name}</span>
          <button
            className="ghost-button"
            onClick={() => {
              void auth.logout().then(() => navigate({ to: '/login' }))
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <nav className="subnav">
        <Link to="/app" activeProps={{ className: 'active' }}>
          Dashboard
        </Link>
        <Link to="/app/monitors/new" activeProps={{ className: 'active' }}>
          Add monitor
        </Link>
      </nav>
      <Outlet />
    </main>
  )
}
