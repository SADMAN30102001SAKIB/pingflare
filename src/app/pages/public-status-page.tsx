import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { Activity, CheckCircle2, Clock3, RadioTower } from 'lucide-react'
import type { PublicStatusPayload } from '../../shared/types'
import { DailyStatusTimeline } from '../components/daily-status-timeline'
import { IncidentList } from '../components/incident-list'
import { StatusPill } from '../components/status-pill'
import { SummaryCard } from '../components/summary-card'
import { apiRequest } from '../lib/api'
import { formatTime } from '../lib/format'
import { ThemeToggle } from '../theme/theme-context'

export function PublicStatusPage() {
  const { slug } = useParams({ from: '/status/$slug' })
  const [payload, setPayload] = React.useState<PublicStatusPayload | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true
    async function load() {
      try {
        const timezoneOffsetMinutes = new Date().getTimezoneOffset()
        const result = await apiRequest<PublicStatusPayload>(
          `/api/public/status/${slug}?tzOffsetMinutes=${timezoneOffsetMinutes}`,
        )
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
  const headline =
    monitor.up === false
      ? 'Service disruption detected'
      : monitor.up === true
        ? 'All systems operational'
        : 'Awaiting first check'

  return (
    <main className="public-page">
      <div className="public-page-toolbar">
        <ThemeToggle />
      </div>
      <section
        className={`public-status-hero ${monitor.up ? 'operational' : monitor.up === false ? 'down' : 'unknown'}`}
      >
        <div className="public-status-copy">
          <div className="eyebrow">
            <RadioTower size={16} />
            {monitor.project}
          </div>
          <h1>{headline}</h1>
          <p>{monitor.name}</p>
          <a href={monitor.url} target="_blank" rel="noreferrer">
            {monitor.url}
          </a>
        </div>
        <StatusPill monitor={monitor} />
      </section>

      <section className="summary-grid public-summary-grid">
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
        <section className="panel public-history-panel">
          <div className="public-section-title">
            <h2>Services</h2>
          </div>
          <DailyStatusTimeline monitor={monitor} days={90} />
          <p className="muted row-note">
            <Clock3 size={15} />
            Last checked {formatTime(monitor.lastCheckedAt)}
          </p>
        </section>
        <IncidentList incidents={payload.incidents} />
      </section>
    </main>
  )
}
