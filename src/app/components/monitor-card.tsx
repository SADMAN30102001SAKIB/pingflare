import { Link } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import type { MonitorRecord } from '../../shared/types'
import { formatTime } from '../lib/format'
import { Metric } from './metric'
import { Sparkline } from './sparkline'
import { StatusPill } from './status-pill'

export function MonitorCard({ monitor }: { monitor: MonitorRecord }) {
  return (
    <article className={`monitor-card ${monitor.up === false ? 'is-down' : ''}`}>
      <div className="monitor-card-top">
        <div>
          <div className="monitor-name-row">
            <h3>{monitor.name}</h3>
            <a
              href={monitor.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${monitor.name}`}
            >
              <ExternalLink size={16} />
            </a>
          </div>
          <p>{monitor.url}</p>
        </div>
        <StatusPill monitor={monitor} />
      </div>
      <div className="metrics-grid">
        <Metric label="24h" value={`${monitor.uptime24h.uptime}%`} />
        <Metric label="7d" value={`${monitor.uptime7d.uptime}%`} />
        <Metric label="30d" value={`${monitor.uptime30d.uptime}%`} />
        <Metric
          label="Latency"
          value={monitor.lastResponseTimeMs ? `${monitor.lastResponseTimeMs}ms` : '-'}
        />
      </div>
      <Sparkline monitor={monitor} />
      <div className="monitor-footer">
        <span>Last checked {formatTime(monitor.lastCheckedAt)}</span>
        <span>Every {monitor.intervalMinutes}m</span>
        <span>{monitor.telegramConfigured ? 'Telegram ready' : 'Telegram missing'}</span>
      </div>
      <div className="monitor-link-row">
        <Link to="/app/monitors/$monitorId" params={{ monitorId: monitor.id }}>
          Edit monitor
        </Link>
        <Link to="/status/$slug" params={{ slug: monitor.publicSlug }}>
          Public page
        </Link>
      </div>
      {monitor.lastErrorMessage ? <p className="error-line">{monitor.lastErrorMessage}</p> : null}
    </article>
  )
}
