import { LOGS_API } from "../config/constants"

type LoggerPayload = {
  type: string,
  message: string,
  data: object | undefined | string | null
}

const loggerApi = async (payload: LoggerPayload) => {
  try {
    await fetch(LOGS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Error sending log:', error)
  }
}

export const Logger = {
  info: (message: string, data?: object | string | null) => loggerApi({ type: 'info', message, data }),
  debug: (message: string, data?: object | string | null) => loggerApi({ type: 'debug', message, data }),
  warn: (message: string, data?: object | string | null) => loggerApi({ type: 'warning', message, data }),
  error: (message: string, data?: object | string | null) => loggerApi({ type: 'error', message, data }),
}