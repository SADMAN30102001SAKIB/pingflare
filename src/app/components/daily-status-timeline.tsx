import type { DailyStatusPoint, MonitorRecord } from '../../shared/types'

function dayKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(day: string) {
  const [year, month, date] = day.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, date))
}

function toneForDay(point: DailyStatusPoint | undefined) {
  if (!point || point.total === 0) return 'unknown'
  if (point.down === 0) return 'up'
  if (point.up === 0) return 'down'
  return 'degraded'
}

function titleForDay(point: DailyStatusPoint | undefined, day: string, intervalMinutes: number) {
  const label = formatDayLabel(day)
  if (!point || point.total === 0) return `${label}: no checks recorded`

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
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    date.setDate(date.getDate() - (days - 1 - index))
    return dayKey(date)
  })

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
          const tone = toneForDay(point)
          return (
            <span
              key={key}
              className={`daily-status-bar ${tone}`}
              title={titleForDay(point, key, monitor.intervalMinutes)}
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
