import { useEffect, useRef } from 'react'

import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import i18n from '../i18n/index.ts'
import { type ApiError, isApiError } from '../libs/httpErrorHandler.ts'
import { useToast } from './useToast.ts'

export const useErrorNotification = (
  isError: boolean,
  error: Error | ApiError | null,
) => {
  const { toast } = useToast()
  const errorShownRef = useRef<string | null>(null)

  useEffect(() => {
    if (isError && error) {
      const errorId = `${error.message}-${Date.now()}`

      if (errorShownRef.current !== errorId) {
        errorShownRef.current = errorId

        const title = isApiError(error)
          ? error.title
          : i18n.t('errors:generic.unknownTitle')
        const message = error.message

        toast({
          title,
          message,
          severity: TOAST_SEVERITY.ERROR,
        })
      }
    }

    if (!isError) {
      errorShownRef.current = null
    }
  }, [isError, error, toast])
}
