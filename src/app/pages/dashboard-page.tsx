import * as React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Plus,
  RadioTower,
  ShieldCheck,
} from 'lucide-react'
import type { DashboardPayload } from '../../shared/types'
import { useAuth } from '../auth/auth-context'
import { IncidentList } from '../components/incident-list'
import { MonitorCard } from '../components/monitor-card'
import { SummaryCard } from '../components/summary-card'
import { apiRequest } from '../lib/api'

export function DashboardPage() {
  const auth = useAuth()
  const [payload, setPayload] = React.useState<DashboardPayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await apiRequest<DashboardPayload>(
          '/api/app/dashboard',
          undefined,
          auth.token,
        )
        if (active) setPayload(result)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError))
      }
    }
    void load()
    const timer = window.setInterval(() => void load(), 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [auth.token])

  if (!payload && !error) return <div className="center-panel">Loading dashboard...</div>
  if (error) return <div className="error-banner">{error}</div>
  if (!payload) return null

  const monitorCount = payload.overall.total
  const statusCopy =
    payload.overall.down === 0
      ? 'All monitored endpoints are operational.'
      : `${payload.overall.down} monitor${payload.overall.down === 1 ? '' : 's'} need attention.`

  return (
    <>
      <section className={`status-overview ${payload.overall.status}`}>
        <div className="status-overview-main">
          <span className="status-indicator">
            <Activity size={18} />
            {payload.overall.status}
          </span>
          <h2>{statusCopy}</h2>
          <p>
            {monitorCount} monitor{monitorCount === 1 ? '' : 's'} grouped by client, with
            response-time history, Telegram alerts, and public status pages.
          </p>
        </div>
        <Link className="primary-link" to="/app/monitors/new">
          <Plus size={16} />
          Add monitor
        </Link>
      </section>

      <section className="summary-grid">
        <SummaryCard
          icon={<RadioTower size={20} />}
          label="Monitors"
          value={String(payload.overall.total)}
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="Operational"
          value={String(payload.overall.up)}
        />
        <SummaryCard
          icon={<AlertTriangle size={20} />}
          label="Down"
          value={String(payload.overall.down)}
        />
        <SummaryCard
          icon={<ShieldCheck size={20} />}
          label="Unknown"
          value={String(payload.overall.unknown)}
        />
      </section>

      <section className="content-layout">
        <div className="projects">
          <div className="section-toolbar">
            <div>
              <p className="eyebrow">Monitor list</p>
              <h2>Services</h2>
            </div>
            <span className="refresh-note">
              <Clock3 size={15} />
              Auto-refreshes every 60s
            </span>
          </div>
          {payload.projects.length === 0 ? (
            <section className="panel empty-state">
              <h2>No monitors yet</h2>
              <p>Create your first monitor to start tracking uptime and publish a status page.</p>
              <Link className="primary-link" to="/app/monitors/new">
                <Plus size={16} />
                Create monitor
              </Link>
            </section>
          ) : (
            payload.projects.map((project) => (
              <section key={project.name} className="project-section">
                <div className="project-heading">
                  <h2>{project.name}</h2>
                  <span>
                    {project.monitors.length} monitor{project.monitors.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="monitor-grid">
                  {project.monitors.map((monitor) => (
                    <MonitorCard key={monitor.id} monitor={monitor} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
        <IncidentList incidents={payload.incidents} />
      </section>
    </>
  )
}
