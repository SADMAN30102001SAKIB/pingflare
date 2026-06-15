import {
  getPreviousState,
  listDueMonitors,
  markNotified,
  openIncident,
  pruneExpiredSessions,
  recordCheck,
  resolveIncident,
  type MonitorRow,
} from './db'
import type { Env } from './env'
import { buildDownMessage, buildRecoveredMessage, sendTelegram } from './telegram'

type CheckResult = {
  checkedAt: number
  up: boolean
  statusCode: number | null
  responseTimeMs: number
  errorMessage: string | null
}

async function checkMonitor(monitor: MonitorRow): Promise<CheckResult> {
  const checkedAt = Math.floor(Date.now() / 1000)
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), monitor.timeout_ms)

  try {
    const response = await fetch(monitor.url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'PingFlare/1.0' },
      cf: { cacheTtlByStatus: { '100-599': -1 } },
    })

    try {
      await response.body?.cancel()
    } catch (error) {
      console.log(
        JSON.stringify({
          level: 'warn',
          message: 'Response body cancellation failed',
          monitorId: monitor.id,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }

    const responseTimeMs = Date.now() - startedAt
    const up = response.status === monitor.expected_status
    return {
      checkedAt,
      up,
      statusCode: response.status,
      responseTimeMs,
      errorMessage: up ? null : `Expected HTTP ${monitor.expected_status}, got ${response.status}`,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startedAt
    const isTimeout = error instanceof Error && error.name === 'AbortError'
    return {
      checkedAt,
      up: false,
      statusCode: null,
      responseTimeMs: isTimeout ? monitor.timeout_ms : responseTimeMs,
      errorMessage: isTimeout
        ? `Timeout after ${monitor.timeout_ms}ms`
        : error instanceof Error
          ? error.message
          : String(error),
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function runLimited<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>) {
  const results: R[] = []
  for (let index = 0; index < items.length; index += limit) {
    results.push(...(await Promise.all(items.slice(index, index + limit).map(worker))))
  }
  return results
}

async function handleStateChange(env: Env, monitor: MonitorRow, result: CheckResult) {
  const previous = await getPreviousState(env, monitor.id)
  const previousStatus = previous ? previous.up === 1 : null
  const changed = previousStatus === null ? !result.up : previousStatus !== result.up

  await recordCheck(env, monitor, result)
  if (!changed) return

  if (!result.up) {
    await openIncident(env, monitor.id, result.checkedAt, result.errorMessage, result.statusCode)
    const sent = await sendTelegram(
      monitor,
      buildDownMessage({
        project: monitor.project,
        name: monitor.name,
        url: monitor.url,
        statusCode: result.statusCode,
        responseTimeMs: result.responseTimeMs,
        checkedAt: result.checkedAt,
        errorMessage: result.errorMessage,
      }),
    )
    if (sent) await markNotified(env, monitor.id, 'down')
    return
  }

  const incident = await resolveIncident(env, monitor.id, result.checkedAt)
  const sent = await sendTelegram(
    monitor,
    buildRecoveredMessage({
      project: monitor.project,
      name: monitor.name,
      url: monitor.url,
      statusCode: result.statusCode,
      responseTimeMs: result.responseTimeMs,
      checkedAt: result.checkedAt,
      errorMessage: result.errorMessage,
      downtimeSeconds: incident ? result.checkedAt - incident.started_at : 0,
    }),
  )
  if (sent) await markNotified(env, monitor.id, 'up')
}

export async function runChecks(env: Env) {
  const monitors = await listDueMonitors(env)

  const checked = await runLimited(monitors, 5, async (monitor) => {
    const result = await checkMonitor(monitor)
    await handleStateChange(env, monitor, result)
    return result
  })

  await pruneExpiredSessions(env)

  return {
    checked: checked.length,
    up: checked.filter((result) => result.up).length,
    down: checked.filter((result) => !result.up).length,
  }
}
