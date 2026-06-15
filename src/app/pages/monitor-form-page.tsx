import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { ArrowRight, RadioTower, ShieldCheck } from 'lucide-react'
import type { MonitorInput, MonitorRecord } from '../../shared/types'
import { useAuth } from '../auth/auth-context'
import { apiRequest } from '../lib/api'

export function MonitorFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const monitorId = typeof params.monitorId === 'string' ? params.monitorId : null
  const [loading, setLoading] = React.useState(mode === 'edit')
  const [error, setError] = React.useState<string | null>(null)
  const [project, setProject] = React.useState('Default Project')
  const [name, setName] = React.useState('')
  const [url, setUrl] = React.useState('https://')
  const [expectedStatus, setExpectedStatus] = React.useState('200')
  const [timeoutMs, setTimeoutMs] = React.useState('5000')
  const [intervalMinutes, setIntervalMinutes] = React.useState('5')
  const [enabled, setEnabled] = React.useState(true)
  const [telegramEnabled, setTelegramEnabled] = React.useState(false)
  const [telegramBotToken, setTelegramBotToken] = React.useState('')
  const [telegramChatId, setTelegramChatId] = React.useState('')
  const [publicSlug, setPublicSlug] = React.useState('')
  const [isPublic, setIsPublic] = React.useState(true)

  React.useEffect(() => {
    if (mode !== 'edit' || !monitorId) return

    let active = true
    async function load() {
      try {
        const monitor = await apiRequest<MonitorRecord>(
          `/api/app/monitors/${monitorId}`,
          undefined,
          auth.token,
        )
        if (!active) return
        setProject(monitor.project)
        setName(monitor.name)
        setUrl(monitor.url)
        setExpectedStatus(String(monitor.expectedStatus))
        setTimeoutMs(String(monitor.timeoutMs))
        setIntervalMinutes(String(monitor.intervalMinutes))
        setEnabled(monitor.enabled)
        setTelegramEnabled(monitor.telegramEnabled)
        setPublicSlug(monitor.publicSlug)
        setIsPublic(monitor.isPublic)
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : String(loadError))
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [auth.token, mode, monitorId])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const payload: MonitorInput = {
      project,
      name,
      url,
      expectedStatus: Number(expectedStatus),
      timeoutMs: Number(timeoutMs),
      intervalMinutes: Number(intervalMinutes),
      enabled,
      telegramEnabled,
      telegramBotToken,
      telegramChatId,
      publicSlug,
      isPublic,
    }

    try {
      if (mode === 'create') {
        await apiRequest(
          '/api/app/monitors',
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
          auth.token,
        )
      } else if (monitorId) {
        await apiRequest(
          `/api/app/monitors/${monitorId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(payload),
          },
          auth.token,
        )
      }
      void navigate({ to: '/app' })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError))
    }
  }

  async function handleDelete() {
    if (!monitorId) return
    const confirmed = window.confirm('Delete this monitor?')
    if (!confirmed) return
    await apiRequest(`/api/app/monitors/${monitorId}`, { method: 'DELETE' }, auth.token)
    void navigate({ to: '/app' })
  }

  if (loading) return <div className="center-panel">Loading monitor...</div>

  return (
    <section className="editor-layout">
      <div className="editor-header">
        <div>
          <div className="eyebrow warm">
            <ShieldCheck size={16} />
            {mode === 'create' ? 'New monitor' : 'Edit monitor'}
          </div>
          <h1 className="workspace-title">
            {mode === 'create' ? 'Add a client API monitor' : 'Update monitor settings'}
          </h1>
        </div>
        {mode === 'edit' && publicSlug ? (
          <Link className="ghost-link" to="/status/$slug" params={{ slug: publicSlug }}>
            View public page
            <ArrowRight size={16} />
          </Link>
        ) : null}
      </div>

      <form className="editor-grid" onSubmit={(event) => void handleSubmit(event)}>
        <section className="panel form-panel">
          <label>
            Client / Project
            <input value={project} onChange={(event) => setProject(event.target.value)} />
          </label>
          <label>
            Monitor name
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            Health URL
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
          <div className="inline-fields">
            <label>
              Expected status
              <input
                value={expectedStatus}
                onChange={(event) => setExpectedStatus(event.target.value)}
              />
            </label>
            <label>
              Timeout (ms)
              <input value={timeoutMs} onChange={(event) => setTimeoutMs(event.target.value)} />
            </label>
          </div>
          <label>
            Check interval
            <select
              value={intervalMinutes}
              onChange={(event) => setIntervalMinutes(event.target.value)}
            >
              <option value="1">Every 1 minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="10">Every 10 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 1 hour</option>
            </select>
          </label>
          <div className="toggle-grid">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(event) => setEnabled(event.target.checked)}
              />
              Enabled
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(event) => setIsPublic(event.target.checked)}
              />
              Public status page
            </label>
          </div>
          <label>
            Public slug
            <input value={publicSlug} onChange={(event) => setPublicSlug(event.target.value)} />
          </label>
        </section>

        <section className="panel form-panel">
          <div className="panel-heading">
            <RadioTower size={18} />
            <h2>Telegram alerts</h2>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={telegramEnabled}
              onChange={(event) => setTelegramEnabled(event.target.checked)}
            />
            Send down and recovery alerts for this monitor
          </label>
          <label>
            Telegram bot token
            <input
              value={telegramBotToken}
              onChange={(event) => setTelegramBotToken(event.target.value)}
              type="password"
              placeholder={
                mode === 'edit' ? 'Enter new token to replace existing one' : '123456789:ABC...'
              }
            />
          </label>
          <label>
            Telegram chat ID
            <input
              value={telegramChatId}
              onChange={(event) => setTelegramChatId(event.target.value)}
              placeholder={
                mode === 'edit' ? 'Enter new chat id to replace existing one' : '123456789'
              }
            />
          </label>
          <p className="muted">
            Each monitor owns its own Telegram settings. On edit, leave credential fields blank to
            keep the saved values.
          </p>
        </section>

        <div className="editor-actions">
          <button className="primary-button" type="submit">
            {mode === 'create' ? 'Create monitor' : 'Save changes'}
          </button>
          {mode === 'edit' ? (
            <button className="danger-button" type="button" onClick={() => void handleDelete()}>
              Delete monitor
            </button>
          ) : null}
        </div>
        {error ? <p className="error-line">{error}</p> : null}
      </form>
    </section>
  )
}
