import { AlertTriangle } from 'lucide-react'
import type { Incident } from '../../shared/types'
import { formatDuration } from '../lib/format'

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <AlertTriangle size={18} />
        <h2>Recent incidents</h2>
      </div>
      {incidents.length === 0 ? (
        <p className="muted">No incidents yet.</p>
      ) : (
        <div className="incident-list">
          {incidents.map((incident) => (
            <article key={incident.id} className="incident-item">
              <div>
                <strong>
                  {incident.project} / {incident.name}
                </strong>
                <p>{incident.errorMessage ?? `HTTP ${incident.statusCode ?? 'unknown'}`}</p>
              </div>
              <div className="incident-meta">
                <span className={incident.resolvedAt ? 'resolved' : 'open'}>
                  {incident.resolvedAt ? 'Resolved' : 'Open'}
                </span>
                <span>{formatDuration(incident.startedAt, incident.resolvedAt)}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
