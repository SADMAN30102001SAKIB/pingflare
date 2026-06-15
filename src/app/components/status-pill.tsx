import type { MonitorRecord } from '../../shared/types'
import { statusTextForMonitor } from '../lib/format'

export function StatusPill({ monitor }: { monitor: MonitorRecord }) {
  const tone = monitor.up === null ? 'pending' : monitor.up ? 'up' : 'down'
  return <span className={`status-pill ${tone}`}>{statusTextForMonitor(monitor)}</span>
}
