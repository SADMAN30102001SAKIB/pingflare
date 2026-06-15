import type {
  AuthPayload,
  DailyStatusPoint,
  DashboardPayload,
  Incident,
  LatencyPoint,
  MonitorInput,
  MonitorRecord,
  PublicStatusPayload,
  UptimeWindow,
  UserProfile,
} from '../shared/types'
import type { Env } from './env'

type UserRow = {
  id: string
  name: string
  email: string
  password_hash: string
  password_salt: string
  created_at: number
}

export type MonitorRow = {
  id: string
  user_id: string
  project: string
  name: string
  url: string
  expected_status: number
  timeout_ms: number
  interval_minutes: number
  enabled: number
  telegram_enabled: number
  telegram_bot_token: string | null
  telegram_chat_id: string | null
  public_slug: string
  is_public: number
  created_at: number
  updated_at: number
  up: number | null
  last_checked_at: number | null
  last_status_code: number | null
  last_response_time_ms: number | null
  last_error_message: string | null
}

type SessionRow = {
  token: string
  user_id: string
  expires_at: number
}

type ResultRow = {
  checked_at: number
  up: number
  status_code: number | null
  response_time_ms: number
  error_message: string | null
}

type DailyResultRow = {
  day: string
  total: number
  up: number
  avg_response_time_ms: number | null
}

type IncidentRow = {
  id: number
  monitor_id: string
  project: string
  name: string
  url: string
  started_at: number
  resolved_at: number | null
  error_message: string | null
  status_code: number | null
}

export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60

function mapUser(row: Pick<UserRow, 'id' | 'name' | 'email' | 'created_at'>): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  }
}

async function getUptimeWindow(
  env: Env,
  monitorId: string,
  seconds: number,
): Promise<UptimeWindow> {
  const since = Math.floor(Date.now() / 1000) - seconds
  const row = await env.DB.prepare(
    `SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN up = 1 THEN 1 ELSE 0 END), 0) AS up
     FROM check_results
     WHERE monitor_id = ? AND checked_at >= ?`,
  )
    .bind(monitorId, since)
    .first<{ total: number; up: number }>()

  const total = row?.total ?? 0
  const up = row?.up ?? 0
  const down = total - up
  return {
    total,
    up,
    down,
    uptime: total === 0 ? 100 : Number(((up / total) * 100).toFixed(2)),
  }
}

async function getRecentResults(env: Env, monitorId: string, limit = 32): Promise<LatencyPoint[]> {
  const rows = await env.DB.prepare(
    `SELECT checked_at, up, status_code, response_time_ms, error_message
     FROM check_results
     WHERE monitor_id = ?
     ORDER BY checked_at DESC
     LIMIT ?`,
  )
    .bind(monitorId, limit)
    .all<ResultRow>()

  return rows.results.reverse().map((row) => ({
    checkedAt: row.checked_at,
    up: row.up === 1,
    statusCode: row.status_code,
    responseTimeMs: row.response_time_ms,
    errorMessage: row.error_message,
  }))
}

async function getDailyResults(env: Env, monitorId: string, days = 90): Promise<DailyStatusPoint[]> {
  const since = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60
  const rows = await env.DB.prepare(
    `SELECT
      date(checked_at, 'unixepoch') AS day,
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN up = 1 THEN 1 ELSE 0 END), 0) AS up,
      ROUND(AVG(response_time_ms)) AS avg_response_time_ms
     FROM check_results
     WHERE monitor_id = ? AND checked_at >= ?
     GROUP BY day
     ORDER BY day ASC`,
  )
    .bind(monitorId, since)
    .all<DailyResultRow>()

  return rows.results.map((row) => {
    const total = row.total ?? 0
    const up = row.up ?? 0
    const down = total - up
    return {
      day: row.day,
      total,
      up,
      down,
      avgResponseTimeMs: row.avg_response_time_ms,
      uptime: total === 0 ? 100 : Number(((up / total) * 100).toFixed(2)),
    }
  })
}

function mapIncident(row: IncidentRow): Incident {
  return {
    id: row.id,
    monitorId: row.monitor_id,
    project: row.project,
    name: row.name,
    url: row.url,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    errorMessage: row.error_message,
    statusCode: row.status_code,
  }
}

async function enrichMonitor(env: Env, row: MonitorRow): Promise<MonitorRecord> {
  return {
    id: row.id,
    project: row.project,
    name: row.name,
    url: row.url,
    expectedStatus: row.expected_status,
    timeoutMs: row.timeout_ms,
    intervalMinutes: row.interval_minutes,
    enabled: row.enabled === 1,
    telegramEnabled: row.telegram_enabled === 1,
    telegramConfigured: Boolean(row.telegram_bot_token && row.telegram_chat_id),
    publicSlug: row.public_slug,
    isPublic: row.is_public === 1,
    up: row.up === null ? null : row.up === 1,
    lastCheckedAt: row.last_checked_at,
    lastStatusCode: row.last_status_code,
    lastResponseTimeMs: row.last_response_time_ms,
    lastErrorMessage: row.last_error_message,
    uptime24h: await getUptimeWindow(env, row.id, 24 * 60 * 60),
    uptime7d: await getUptimeWindow(env, row.id, 7 * 24 * 60 * 60),
    uptime30d: await getUptimeWindow(env, row.id, 30 * 24 * 60 * 60),
    recentResults: await getRecentResults(env, row.id),
    dailyResults: await getDailyResults(env, row.id),
  }
}

async function listIncidentRowsForMonitor(env: Env, monitorId: string, limit: number) {
  const rows = await env.DB.prepare(
    `SELECT
      i.id,
      i.monitor_id,
      m.project,
      m.name,
      m.url,
      i.started_at,
      i.resolved_at,
      i.error_message,
      i.status_code
     FROM incidents i
     INNER JOIN monitors m ON m.id = i.monitor_id
     WHERE i.monitor_id = ?
     ORDER BY i.started_at DESC
     LIMIT ?`,
  )
    .bind(monitorId, limit)
    .all<IncidentRow>()

  return rows.results
}

export async function findUserByEmail(env: Env, email: string) {
  return env.DB.prepare(
    `SELECT id, name, email, password_hash, password_salt, created_at
     FROM users
     WHERE lower(email) = lower(?)`,
  )
    .bind(email)
    .first<UserRow>()
}

export async function createUser(
  env: Env,
  user: { id: string; name: string; email: string; passwordHash: string; passwordSalt: string },
) {
  const createdAt = Math.floor(Date.now() / 1000)
  await env.DB.prepare(
    `INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(user.id, user.name, user.email, user.passwordHash, user.passwordSalt, createdAt)
    .run()

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt,
  } satisfies UserProfile
}

export async function createSession(env: Env, userId: string, token: string): Promise<AuthPayload> {
  const createdAt = Math.floor(Date.now() / 1000)
  const expiresAt = createdAt + SESSION_TTL_SECONDS
  await env.DB.prepare(
    `INSERT INTO sessions (token, user_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(token, userId, createdAt, expiresAt)
    .run()

  const user = await env.DB.prepare(`SELECT id, name, email, created_at FROM users WHERE id = ?`)
    .bind(userId)
    .first<Pick<UserRow, 'id' | 'name' | 'email' | 'created_at'>>()

  if (!user) {
    throw new Error('User missing for new session')
  }

  return {
    token,
    user: mapUser(user),
  }
}

export async function getUserFromToken(env: Env, token: string | null) {
  if (!token) return null

  const now = Math.floor(Date.now() / 1000)
  const row = await env.DB.prepare(
    `SELECT s.token, s.user_id, s.expires_at, u.id, u.name, u.email, u.created_at
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`,
  )
    .bind(token, now)
    .first<SessionRow & Pick<UserRow, 'id' | 'name' | 'email' | 'created_at'>>()

  if (!row) return null

  return {
    token: row.token,
    user: mapUser(row),
  }
}

export async function deleteSession(env: Env, token: string | null) {
  if (!token) return
  await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run()
}

export async function pruneExpiredSessions(env: Env) {
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now).run()
}

export async function createMonitor(
  env: Env,
  userId: string,
  monitorId: string,
  input: MonitorInput,
) {
  const now = Math.floor(Date.now() / 1000)
  await env.DB.prepare(
    `INSERT INTO monitors (
      id, user_id, project, name, url, expected_status, timeout_ms, interval_minutes, enabled,
      telegram_enabled, telegram_bot_token, telegram_chat_id, public_slug, is_public,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      monitorId,
      userId,
      input.project,
      input.name,
      input.url,
      input.expectedStatus,
      input.timeoutMs,
      input.intervalMinutes,
      input.enabled ? 1 : 0,
      input.telegramEnabled ? 1 : 0,
      input.telegramBotToken?.trim() || null,
      input.telegramChatId?.trim() || null,
      input.publicSlug,
      input.isPublic ? 1 : 0,
      now,
      now,
    )
    .run()

  return getMonitorById(env, userId, monitorId)
}

export async function updateMonitor(
  env: Env,
  userId: string,
  monitorId: string,
  input: MonitorInput,
) {
  const now = Math.floor(Date.now() / 1000)
  const existing = await env.DB.prepare(
    `SELECT telegram_bot_token, telegram_chat_id
     FROM monitors
     WHERE id = ? AND user_id = ?`,
  )
    .bind(monitorId, userId)
    .first<Pick<MonitorRow, 'telegram_bot_token' | 'telegram_chat_id'>>()

  const telegramBotToken = input.telegramBotToken?.trim() || existing?.telegram_bot_token || null
  const telegramChatId = input.telegramChatId?.trim() || existing?.telegram_chat_id || null

  await env.DB.prepare(
    `UPDATE monitors
     SET project = ?, name = ?, url = ?, expected_status = ?, timeout_ms = ?, interval_minutes = ?, enabled = ?,
         telegram_enabled = ?, telegram_bot_token = ?, telegram_chat_id = ?, public_slug = ?,
         is_public = ?, updated_at = ?
     WHERE id = ? AND user_id = ?`,
  )
    .bind(
      input.project,
      input.name,
      input.url,
      input.expectedStatus,
      input.timeoutMs,
      input.intervalMinutes,
      input.enabled ? 1 : 0,
      input.telegramEnabled ? 1 : 0,
      telegramBotToken,
      telegramChatId,
      input.publicSlug,
      input.isPublic ? 1 : 0,
      now,
      monitorId,
      userId,
    )
    .run()

  return getMonitorById(env, userId, monitorId)
}

export async function deleteMonitor(env: Env, userId: string, monitorId: string) {
  await env.DB.prepare('DELETE FROM monitors WHERE id = ? AND user_id = ?')
    .bind(monitorId, userId)
    .run()
}

export async function getMonitorById(env: Env, userId: string, monitorId: string) {
  const row = await env.DB.prepare(
    `SELECT
      m.*,
      s.up,
      s.last_checked_at,
      s.last_status_code,
      s.last_response_time_ms,
      s.last_error_message
     FROM monitors m
     LEFT JOIN monitor_states s ON s.monitor_id = m.id
     WHERE m.id = ? AND m.user_id = ?`,
  )
    .bind(monitorId, userId)
    .first<MonitorRow>()

  if (!row) return null
  return enrichMonitor(env, row)
}

export async function listUserMonitors(env: Env, userId: string) {
  const rows = await env.DB.prepare(
    `SELECT
      m.*,
      s.up,
      s.last_checked_at,
      s.last_status_code,
      s.last_response_time_ms,
      s.last_error_message
     FROM monitors m
     LEFT JOIN monitor_states s ON s.monitor_id = m.id
     WHERE m.user_id = ?
     ORDER BY m.project, m.name`,
  )
    .bind(userId)
    .all<MonitorRow>()

  const monitors: MonitorRecord[] = []
  for (const row of rows.results) {
    monitors.push(await enrichMonitor(env, row))
  }
  return monitors
}

export async function getDashboardPayload(env: Env, user: UserProfile): Promise<DashboardPayload> {
  const monitors = await listUserMonitors(env, user.id)
  const incidentRows = await env.DB.prepare(
    `SELECT
      i.id,
      i.monitor_id,
      m.project,
      m.name,
      m.url,
      i.started_at,
      i.resolved_at,
      i.error_message,
      i.status_code
     FROM incidents i
     INNER JOIN monitors m ON m.id = i.monitor_id
     WHERE m.user_id = ?
     ORDER BY i.started_at DESC
     LIMIT 20`,
  )
    .bind(user.id)
    .all<IncidentRow>()

  const incidents = incidentRows.results.map(mapIncident)
  const total = monitors.length
  const down = monitors.filter((monitor) => monitor.up === false).length
  const up = monitors.filter((monitor) => monitor.up === true).length
  const unknown = total - up - down
  const status =
    total === 0 || unknown === total
      ? 'unknown'
      : down === 0
        ? 'operational'
        : up > 0
          ? 'degraded'
          : 'down'

  const grouped = new Map<string, MonitorRecord[]>()
  for (const monitor of monitors) {
    grouped.set(monitor.project, [...(grouped.get(monitor.project) ?? []), monitor])
  }

  return {
    generatedAt: Math.floor(Date.now() / 1000),
    user,
    overall: { total, up, down, unknown, status },
    projects: Array.from(grouped.entries()).map(([name, projectMonitors]) => ({
      name,
      monitors: projectMonitors,
    })),
    incidents,
  }
}

export async function getPublicStatusPayload(
  env: Env,
  slug: string,
): Promise<PublicStatusPayload | null> {
  const row = await env.DB.prepare(
    `SELECT
      m.*,
      s.up,
      s.last_checked_at,
      s.last_status_code,
      s.last_response_time_ms,
      s.last_error_message
     FROM monitors m
     LEFT JOIN monitor_states s ON s.monitor_id = m.id
     WHERE m.public_slug = ? AND m.is_public = 1`,
  )
    .bind(slug)
    .first<MonitorRow>()

  if (!row) return null

  const monitor = await enrichMonitor(env, row)
  const incidents = (await listIncidentRowsForMonitor(env, row.id, 12)).map(mapIncident)

  return {
    generatedAt: Math.floor(Date.now() / 1000),
    monitor,
    incidents,
  }
}

export async function listDueMonitors(
  env: Env,
  now = Math.floor(Date.now() / 1000),
): Promise<MonitorRow[]> {
  const rows = await env.DB.prepare(
    `SELECT
      m.*,
      s.up,
      s.last_checked_at,
      s.last_status_code,
      s.last_response_time_ms,
      s.last_error_message
     FROM monitors m
     LEFT JOIN monitor_states s ON s.monitor_id = m.id
     WHERE m.enabled = 1
       AND (
         s.last_checked_at IS NULL OR
         s.last_checked_at <= ? - (m.interval_minutes * 60)
       )
     ORDER BY m.updated_at ASC`,
  )
    .bind(now)
    .all<MonitorRow>()

  return rows.results
}

export async function getPreviousState(env: Env, monitorId: string) {
  return env.DB.prepare('SELECT up, last_notified_status FROM monitor_states WHERE monitor_id = ?')
    .bind(monitorId)
    .first<{ up: number; last_notified_status: string | null }>()
}

export async function recordCheck(
  env: Env,
  monitor: MonitorRow,
  result: {
    checkedAt: number
    up: boolean
    statusCode: number | null
    responseTimeMs: number
    errorMessage: string | null
  },
) {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO check_results (
        monitor_id, checked_at, up, status_code, response_time_ms, error_message
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      monitor.id,
      result.checkedAt,
      result.up ? 1 : 0,
      result.statusCode,
      result.responseTimeMs,
      result.errorMessage,
    ),
    env.DB.prepare(
      `INSERT INTO monitor_states (
        monitor_id, up, last_checked_at, last_status_code, last_response_time_ms,
        last_error_message, last_notified_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(monitor_id) DO UPDATE SET
        up = excluded.up,
        last_checked_at = excluded.last_checked_at,
        last_status_code = excluded.last_status_code,
        last_response_time_ms = excluded.last_response_time_ms,
        last_error_message = excluded.last_error_message`,
    ).bind(
      monitor.id,
      result.up ? 1 : 0,
      result.checkedAt,
      result.statusCode,
      result.responseTimeMs,
      result.errorMessage,
      result.up ? 'up' : 'down',
    ),
  ])
}

export async function markNotified(env: Env, monitorId: string, status: 'up' | 'down') {
  await env.DB.prepare('UPDATE monitor_states SET last_notified_status = ? WHERE monitor_id = ?')
    .bind(status, monitorId)
    .run()
}

export async function openIncident(
  env: Env,
  monitorId: string,
  checkedAt: number,
  errorMessage: string | null,
  statusCode: number | null,
) {
  await env.DB.prepare(
    `INSERT INTO incidents (monitor_id, started_at, error_message, status_code)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(monitorId, checkedAt, errorMessage, statusCode)
    .run()
}

export async function resolveIncident(env: Env, monitorId: string, checkedAt: number) {
  const incident = await env.DB.prepare(
    `SELECT id, started_at FROM incidents
     WHERE monitor_id = ? AND resolved_at IS NULL
     ORDER BY started_at DESC
     LIMIT 1`,
  )
    .bind(monitorId)
    .first<{ id: number; started_at: number }>()

  if (!incident) return null

  await env.DB.prepare('UPDATE incidents SET resolved_at = ? WHERE id = ?')
    .bind(checkedAt, incident.id)
    .run()

  return incident
}

export async function pruneOldResults(env: Env, retentionDays = 90) {
  const cutoff = Math.floor(Date.now() / 1000) - retentionDays * 24 * 60 * 60
  await env.DB.prepare('DELETE FROM check_results WHERE checked_at < ?').bind(cutoff).run()
}
