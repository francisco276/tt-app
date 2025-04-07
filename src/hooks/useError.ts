import { useCallback, useMemo, useState } from 'react'
import type { AppError } from '../types'
import { Logger } from '../services/logger'

type ErrorProps = {
  logger: Logger
}

export const useError = ({ logger }:  ErrorProps) => {
  const [errorState, setErrorState] = useState<AppError>({ error: false, message: '' })
  const errorMessage = useMemo(() => errorState.message, [errorState])

  const setError = useCallback((message: string) => {
    if (errorState.error) {
      logger.highlight('previous error', errorState.message)
    }

    setErrorState(() => ({
      error: true,
      message
    }))
  }, [logger])

  const clearError = useCallback(() => {
    if (errorState.error || !!errorState.message) {
      setErrorState(() => ({
        error: false,
        message: ''
      }))
    }
  }, [])

  return {
    errorState,
    clearError,
    setError,
    errorMessage,
  }
}