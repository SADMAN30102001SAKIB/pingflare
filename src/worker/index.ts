import { Hono } from 'hono'
import type { Context } from 'hono'
import { cors } from 'hono/cors'
import {
  createMonitor,
  createSession,
  createUser,
  deleteMonitor,
  deleteSession,
  findUserByEmail,
  getDashboardPayload,
  getMonitorById,
  getPublicStatusPayload,
  getUserFromToken,
  listUserMonitors,
  updateMonitor,
  pruneOldResults,
} from './db'
import type { Env } from './env'
import { runChecks } from './checker'

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (context, next) => {
  const origin = context.env.PUBLIC_ORIGIN || '*'
  return cors({
    origin,
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  })(context, next)
})

function readBearerToken(authorization: string | null) {
  if (!authorization?.startsWith('Bearer ')) return null
  return authorization.slice('Bearer '.length).trim() || null
}

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateMonitorInput(body: Record<string, unknown>) {
  if (typeof body.project !== 'string' || body.project.trim().length < 1)
    return 'Project is required.'
  if (typeof body.name !== 'string' || body.name.trim().length < 1)
    return 'Monitor name is required.'
  if (typeof body.url !== 'string' || !/^https?:\/\//i.test(body.url))
    return 'A valid http or https URL is required.'
  if (
    typeof body.expectedStatus !== 'number' ||
    body.expectedStatus < 100 ||
    body.expectedStatus > 599
  ) {
    return 'Expected status must be a valid HTTP status code.'
  }
  if (typeof body.timeoutMs !== 'number' || body.timeoutMs < 1000 || body.timeoutMs > 60000) {
    return 'Timeout must be between 1000ms and 60000ms.'
  }
  if (
    typeof body.intervalMinutes !== 'number' ||
    !Number.isInteger(body.intervalMinutes) ||
    body.intervalMinutes < 1 ||
    body.intervalMinutes > 1440
  ) {
    return 'Interval must be a whole number between 1 and 1440 minutes.'
  }
  if (typeof body.enabled !== 'boolean') return 'Enabled must be a boolean.'
  if (typeof body.telegramEnabled !== 'boolean') return 'Telegram enabled must be a boolean.'
  if (typeof body.isPublic !== 'boolean') return 'Public visibility must be a boolean.'
  if (typeof body.publicSlug !== 'string' || normalizeSlug(body.publicSlug).length < 3) {
    return 'Public slug must be at least 3 characters.'
  }
  if (body.telegramBotToken !== undefined && typeof body.telegramBotToken !== 'string') {
    return 'Telegram bot token must be a string.'
  }
  if (body.telegramChatId !== undefined && typeof body.telegramChatId !== 'string') {
    return 'Telegram chat id must be a string.'
  }
  return null
}

async function sha256Base64(input: string) {
  const encoded = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  const bytes = new Uint8Array(digest)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function createPasswordRecord(password: string) {
  const salt = crypto.randomUUID()
  const hash = await sha256Base64(`${salt}:${password}`)
  return { salt, hash }
}

async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const actualHash = await sha256Base64(`${salt}:${password}`)
  if (actualHash.length !== expectedHash.length) return false
  let ok = true
  for (let i = 0; i < actualHash.length; i += 1) {
    if (actualHash[i] !== expectedHash[i]) ok = false
  }
  return ok
}

async function requireAuth(context: Context<{ Bindings: Env }>) {
  const token = readBearerToken(context.req.header('Authorization') ?? null)
  const session = await getUserFromToken(context.env, token)
  if (!session) return null
  return session
}

app.post('/api/auth/signup', async (context) => {
  const body = await context.req.json<Record<string, unknown>>()
  if (typeof body.name !== 'string' || body.name.trim().length < 2) {
    return context.json({ error: 'Name must be at least 2 characters.' }, 400)
  }
  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return context.json({ error: 'A valid email is required.' }, 400)
  }
  if (typeof body.password !== 'string' || body.password.length < 8) {
    return context.json({ error: 'Password must be at least 8 characters.' }, 400)
  }

  const existing = await findUserByEmail(context.env, body.email)
  if (existing) return context.json({ error: 'Email already in use.' }, 409)

  const passwordRecord = await createPasswordRecord(body.password)
  const user = await createUser(context.env, {
    id: crypto.randomUUID(),
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
    passwordHash: passwordRecord.hash,
    passwordSalt: passwordRecord.salt,
  })

  const payload = await createSession(context.env, user.id, crypto.randomUUID())
  return context.json(payload, 201)
})

app.post('/api/auth/login', async (context) => {
  const body = await context.req.json<Record<string, unknown>>()
  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return context.json({ error: 'Email and password are required.' }, 400)
  }

  const user = await findUserByEmail(context.env, body.email.trim().toLowerCase())
  if (!user) return context.json({ error: 'Invalid credentials.' }, 401)

  const valid = await verifyPassword(body.password, user.password_salt, user.password_hash)
  if (!valid) return context.json({ error: 'Invalid credentials.' }, 401)

  const payload = await createSession(context.env, user.id, crypto.randomUUID())
  return context.json(payload)
})

app.get('/api/auth/me', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)
  return context.json(session.user)
})

app.post('/api/auth/logout', async (context) => {
  const token = readBearerToken(context.req.header('Authorization') ?? null)
  await deleteSession(context.env, token)
  return context.json({ ok: true })
})

app.get('/api/app/dashboard', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)
  return context.json(await getDashboardPayload(context.env, session.user))
})

app.get('/api/app/monitors', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)
  return context.json(await listUserMonitors(context.env, session.user.id))
})

app.post('/api/app/monitors', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)

  const body = await context.req.json<Record<string, unknown>>()
  const error = validateMonitorInput(body)
  if (error) return context.json({ error }, 400)

  try {
    const monitor = await createMonitor(context.env, session.user.id, crypto.randomUUID(), {
      project: String(body.project).trim(),
      name: String(body.name).trim(),
      url: String(body.url).trim(),
      expectedStatus: Number(body.expectedStatus),
      timeoutMs: Number(body.timeoutMs),
      intervalMinutes: Number(body.intervalMinutes),
      enabled: Boolean(body.enabled),
      telegramEnabled: Boolean(body.telegramEnabled),
      telegramBotToken:
        typeof body.telegramBotToken === 'string' ? body.telegramBotToken : undefined,
      telegramChatId: typeof body.telegramChatId === 'string' ? body.telegramChatId : undefined,
      publicSlug: normalizeSlug(String(body.publicSlug)),
      isPublic: Boolean(body.isPublic),
    })
    return context.json(monitor, 201)
  } catch {
    return context.json({ error: 'Could not create monitor. Public slug may already exist.' }, 409)
  }
})

app.get('/api/app/monitors/:id', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)
  const monitor = await getMonitorById(context.env, session.user.id, context.req.param('id'))
  if (!monitor) return context.json({ error: 'Monitor not found.' }, 404)
  return context.json(monitor)
})

app.patch('/api/app/monitors/:id', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)

  const body = await context.req.json<Record<string, unknown>>()
  const error = validateMonitorInput(body)
  if (error) return context.json({ error }, 400)

  try {
    const monitor = await updateMonitor(context.env, session.user.id, context.req.param('id'), {
      project: String(body.project).trim(),
      name: String(body.name).trim(),
      url: String(body.url).trim(),
      expectedStatus: Number(body.expectedStatus),
      timeoutMs: Number(body.timeoutMs),
      intervalMinutes: Number(body.intervalMinutes),
      enabled: Boolean(body.enabled),
      telegramEnabled: Boolean(body.telegramEnabled),
      telegramBotToken:
        typeof body.telegramBotToken === 'string' ? body.telegramBotToken : undefined,
      telegramChatId: typeof body.telegramChatId === 'string' ? body.telegramChatId : undefined,
      publicSlug: normalizeSlug(String(body.publicSlug)),
      isPublic: Boolean(body.isPublic),
    })
    if (!monitor) return context.json({ error: 'Monitor not found.' }, 404)
    return context.json(monitor)
  } catch {
    return context.json({ error: 'Could not update monitor. Public slug may already exist.' }, 409)
  }
})

app.delete('/api/app/monitors/:id', async (context) => {
  const session = await requireAuth(context)
  if (!session) return context.json({ error: 'Unauthorized' }, 401)
  await deleteMonitor(context.env, session.user.id, context.req.param('id'))
  return context.json({ ok: true })
})

app.get('/api/public/status/:slug', async (context) => {
  const payload = await getPublicStatusPayload(
    context.env,
    normalizeSlug(context.req.param('slug')),
  )
  if (!payload) return context.json({ error: 'Public status page not found.' }, 404)
  return context.json(payload)
})

app.get('/api/health', (context) => context.json({ status: 'ok' }))

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env) {
    if (event.cron === '0 0 * * *') {
      await pruneOldResults(env, 90)
      return
    }

    await runChecks(env)
  },
}
