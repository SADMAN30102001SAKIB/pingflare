import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useAuth } from '../auth/auth-context'

export function LandingPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (!auth.loading) {
      void navigate({ to: auth.user ? '/app' : '/login' })
    }
  }, [auth.loading, auth.user, navigate])

  return <div className="center-panel">Loading...</div>
}
