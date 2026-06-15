import type { MonitorRecord } from '../../shared/types'
import { formatTime } from '../lib/format'

export function Sparkline({ monitor }: { monitor: MonitorRecord }) {
  if (monitor.recentResults.length === 0) {
    return <div className="sparkline empty">No checks yet</div>
  }

  const max = Math.max(
    ...monitor.recentResults.map((point) => point.responseTimeMs),
    monitor.timeoutMs,
    1,
  )
  return (
    <div className="sparkline">
      {monitor.recentResults.map((point) => {
        const height = Math.max(12, Math.round((point.responseTimeMs / max) * 74))
        return (
          <span
            key={`${point.checkedAt}-${point.responseTimeMs}`}
            className={point.up ? 'bar up' : 'bar down'}
            style={{ height }}
            title={`${point.responseTimeMs}ms at ${formatTime(point.checkedAt)}`}
          />
        )
      })}
    </div>
  )
}
