export type UptimeWindow = {
  uptime: number
  total: number
  up: number
  down: number
}

export type LatencyPoint = {
  checkedAt: number
  up: boolean
  statusCode: number | null
  responseTimeMs: number
  errorMessage: string | null
}

export type Incident = {
  id: number
  monitorId: string
  project: string
  name: string
  url: string
  startedAt: number
  resolvedAt: number | null
  errorMessage: string | null
  statusCode: number | null
}

export type UserProfile = {
  id: string
  name: string
  email: string
  createdAt: number
}

export type MonitorRecord = {
  id: string
  project: string
  name: string
  url: string
  expectedStatus: number
  timeoutMs: number
  intervalMinutes: number
  enabled: boolean
  telegramEnabled: boolean
  telegramConfigured: boolean
  publicSlug: string
  isPublic: boolean
  up: boolean | null
  lastCheckedAt: number | null
  lastStatusCode: number | null
  lastResponseTimeMs: number | null
  lastErrorMessage: string | null
  uptime24h: UptimeWindow
  uptime7d: UptimeWindow
  uptime30d: UptimeWindow
  recentResults: LatencyPoint[]
}

export type DashboardPayload = {
  generatedAt: number
  user: UserProfile
  overall: {
    total: number
    up: number
    down: number
    unknown: number
    status: 'operational' | 'degraded' | 'down' | 'unknown'
  }
  projects: Array<{
    name: string
    monitors: MonitorRecord[]
  }>
  incidents: Incident[]
}

export type PublicStatusPayload = {
  generatedAt: number
  monitor: MonitorRecord
  incidents: Incident[]
}

export type AuthPayload = {
  token: string
  user: UserProfile
}

export type MonitorInput = {
  project: string
  name: string
  url: string
  expectedStatus: number
  timeoutMs: number
  intervalMinutes: number
  enabled: boolean
  telegramEnabled: boolean
  telegramBotToken?: string
  telegramChatId?: string
  publicSlug: string
  isPublic: boolean
}
