import React from 'react'
import { useParams } from '@tanstack/react-router'
import { Activity, CheckCircle2, RadioTower } from 'lucide-react'
import type { PublicStatusPayload } from '../../shared/types'
import { IncidentList } from '../components/incident-list'
import { Sparkline } from '../components/sparkline'
import { StatusPill } from '../components/status-pill'
import { SummaryCard } from '../components/summary-card'
import { apiRequest } from '../lib/api'
import { formatTime } from '../lib/format'

export function PublicStatusPage() {
  const { slug } = useParams({ from: '/status/$slug' })
  const [payload, setPayload] = React.useState<PublicStatusPayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function load() {
      try {
        const result = await apiRequest<PublicStatusPayload>(`/api/public/status/${slug}`)
        if (active) setPayload(result)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError))
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [slug])

  if (!payload && !error) return <div className="center-panel">Loading public status...</div>
  if (error) return <div className="error-banner">{error}</div>
  if (!payload) return null

  const monitor = payload.monitor
  return (
    <main className="public-page">
      <section
        className={`hero hero-light ${monitor.up ? 'operational' : monitor.up === false ? 'down' : 'unknown'}`}
      >
        <div className="hero-copy">
          <div className="eyebrow warm">
            <RadioTower size={16} />
            {monitor.project}
          </div>
          <h1>{monitor.name}</h1>
          <p>{monitor.url}</p>
        </div>
        <StatusPill monitor={monitor} />
      </section>

      <section className="summary-grid">
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="24h uptime"
          value={`${monitor.uptime24h.uptime}%`}
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="7d uptime"
          value={`${monitor.uptime7d.uptime}%`}
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          label="30d uptime"
          value={`${monitor.uptime30d.uptime}%`}
        />
        <SummaryCard
          icon={<Activity size={20} />}
          label="Latency"
          value={monitor.lastResponseTimeMs ? `${monitor.lastResponseTimeMs}ms` : '-'}
        />
      </section>

      <section className="content-layout public-layout">
        <section className="panel">
          <div className="panel-heading">
            <Activity size={18} />
            <h2>Response time</h2>
          </div>
          <Sparkline monitor={monitor} />
          <p className="muted">Last checked {formatTime(monitor.lastCheckedAt)}</p>
        </section>
        <IncidentList incidents={payload.incidents} />
      </section>
    </main>
  )
}
