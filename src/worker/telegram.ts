import type { MonitorRow } from './db'

type TelegramMessage = {
  project: string
  name: string
  url: string
  statusCode: number | null
  responseTimeMs: number
  checkedAt: number
  errorMessage: string | null
  downtimeSeconds?: number
}

function formatTimestamp(seconds: number) {
  return new Date(seconds * 1000).toISOString()
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 1) return `${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  if (hours < 1) return `${minutes}m ${remainingSeconds}s`
  return `${hours}h ${minutes % 60}m`
}

export function buildDownMessage(message: TelegramMessage) {
  const reason =
    message.errorMessage ??
    (message.statusCode ? `HTTP ${message.statusCode}` : 'No response before timeout')

  return [
    `[DOWN] ${message.project} / ${message.name}`,
    `URL: ${message.url}`,
    `Reason: ${reason}`,
    `Response time: ${message.responseTimeMs}ms`,
    `Time: ${formatTimestamp(message.checkedAt)}`,
  ].join('\n')
}

export function buildRecoveredMessage(message: TelegramMessage) {
  return [
    `[RECOVERED] ${message.project} / ${message.name}`,
    `URL: ${message.url}`,
    `Status: ${message.statusCode ?? 'OK'}`,
    `Response time: ${message.responseTimeMs}ms`,
    `Downtime: ${formatDuration(message.downtimeSeconds ?? 0)}`,
    `Time: ${formatTimestamp(message.checkedAt)}`,
  ].join('\n')
}

export async function sendTelegram(monitor: MonitorRow, text: string): Promise<boolean> {
  if (monitor.telegram_enabled !== 1 || !monitor.telegram_bot_token || !monitor.telegram_chat_id) {
    return false
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${monitor.telegram_bot_token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: monitor.telegram_chat_id,
          text,
          disable_web_page_preview: true,
        }),
      },
    )

    return response.ok
  } catch (error) {
    console.log(
      JSON.stringify({
        level: 'error',
        message: 'Telegram notification failed',
        monitorId: monitor.id,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
    return false
  }
}
