import { LOGS_API } from "../config/constants"

const loggerApi = async (payload) => {
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
  info: (message, data) => loggerApi({ type: 'info', message, data }),
  debug: (message, data) => loggerApi({ type: 'debug', message, data }),
  warn: (message, data) => loggerApi({ type: 'warning', message, data }),
  error: (message, data) => loggerApi({ type: 'error', message, data }),
}