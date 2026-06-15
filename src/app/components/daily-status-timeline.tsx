import type { DailyStatusPoint, MonitorRecord } from '../../shared/types'

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatDayLabel(day: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`))
}

function toneForDay(point: DailyStatusPoint | undefined) {
  if (!point || point.total === 0) return 'unknown'
  if (point.down === 0) return 'up'
  if (point.up === 0) return 'down'
  return 'degraded'
}

function titleForDay(
  point: DailyStatusPoint | undefined,
  day: string,
  intervalMinutes: number,
  fallbackTone: 'up' | 'down' | 'unknown',
) {
  const label = formatDayLabel(day)
  if (!point || point.total === 0) {
    if (fallbackTone === 'up') return `${label}: operational so far today`
    if (fallbackTone === 'down') return `${label}: down so far today`
    return `${label}: no checks recorded`
  }

  const estimatedDownMinutes = point.down * intervalMinutes
  const downCopy =
    estimatedDownMinutes >= 60
      ? `${Math.round((estimatedDownMinutes / 60) * 10) / 10}h estimated downtime`
      : `${estimatedDownMinutes}m estimated downtime`

  return `${label}: ${point.uptime}% uptime, ${point.up}/${point.total} checks up, ${downCopy}`
}

export function DailyStatusTimeline({
  monitor,
  days = 90,
}: {
  monitor: MonitorRecord
  days?: number
}) {
  const byDay = new Map(monitor.dailyResults.map((point) => [point.day, point]))
  const today = new Date()
  const dayKeys = Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    date.setUTCDate(date.getUTCDate() - (days - 1 - index))
    return dayKey(date)
  })
  const todayKey = dayKeys[dayKeys.length - 1]
  const todayFallbackTone: 'up' | 'down' | 'unknown' = monitor.up
    ? 'up'
    : monitor.up === false
      ? 'down'
      : 'unknown'

  const observed = dayKeys.map((key) => byDay.get(key)).filter(Boolean) as DailyStatusPoint[]
  const averageUptime =
    observed.length === 0
      ? 100
      : Number(
          (
            (observed.reduce((sum, point) => sum + point.up, 0) /
              Math.max(
                observed.reduce((sum, point) => sum + point.total, 0),
                1,
              )) *
            100
          ).toFixed(2),
        )

  return (
    <div className="daily-status">
      <div className="daily-status-header">
        <div>
          <h2>
            {monitor.name}
            <span aria-hidden="true">-&gt;</span>
            <strong>{averageUptime}%</strong>
          </h2>
          <p>{monitor.url}</p>
        </div>
        <span className={`daily-status-state ${monitor.up ? 'up' : monitor.up === false ? 'down' : 'unknown'}`}>
          <span />
          {monitor.up ? 'Operational' : monitor.up === false ? 'Down' : 'Pending'}
        </span>
      </div>
      <div className="daily-status-bars" aria-label={`${days}-day status timeline`}>
        {dayKeys.map((key) => {
          const point = byDay.get(key)
          const fallbackTone = key === todayKey ? todayFallbackTone : 'unknown'
          const tone = toneForDay(point)
          return (
            <span
              key={key}
              className={`daily-status-bar ${tone === 'unknown' ? fallbackTone : tone}`}
              title={titleForDay(point, key, monitor.intervalMinutes, fallbackTone)}
            />
          )
        })}
      </div>
      <div className="daily-status-footer">
        <span>{formatDayLabel(dayKeys[0])}</span>
        <span>Last {days} days</span>
        <span>Today</span>
      </div>
    </div>
  )
}
