import type { MonitorRecord } from '../../shared/types'

export function formatTime(seconds: number | null) {
  if (!seconds) return 'Never'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(seconds * 1000))
}

export function formatDuration(startedAt: number, resolvedAt: number | null) {
  const end = resolvedAt ?? Math.floor(Date.now() / 1000)
  const seconds = Math.max(0, end - startedAt)
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return `${seconds}s`
  const hours = Math.floor(minutes / 60)
  if (hours < 1) return `${minutes}m`
  return `${hours}h ${minutes % 60}m`
}

export function statusTextForMonitor(monitor: MonitorRecord) {
  if (monitor.up === null) return 'Pending'
  return monitor.up ? 'Operational' : 'Down'
}
