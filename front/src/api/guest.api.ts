import { AUTH_ROUTES } from '../constants/auth.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n, { withAcceptLanguage } from '../i18n/index.ts'
import { handleHttpErrorFromServer } from '../libs/httpErrorHandler.ts'
import { fetchWithAuth } from './fetchWithAuth.ts'

/** 429 : quota de créations d'invité atteint pour cette IP. */
export class GuestLimitError extends Error {
  constructor() {
    super('GUEST_LIMIT')
    this.name = 'GuestLimitError'
  }
}

/** 409 `EMAIL_TAKEN` : l'email appartient déjà à un compte. */
export class EmailTakenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EmailTakenError'
  }
}

export const GuestApi = {
  create: async (): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.guest}`, {
      method: 'POST',
      credentials: 'include',
      headers: withAcceptLanguage(),
    })
    // 409 : une session existe déjà (autre onglet) — l'appelant fait fetchMe.
    if (res.ok || res.status === 409) {
      return
    }
    if (res.status === 429) {
      throw new GuestLimitError()
    }
    await handleHttpErrorFromServer(res, {}, i18n.t('guest:errors.createTitle'))
  },

  upgrade: async (input: {
    email: string
    password: string
  }): Promise<{ pendingEmail: string }> => {
    const res = await fetchWithAuth(`${apiUrl}${AUTH_ROUTES.guestUpgrade}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (res.status === 409) {
      const body = await res
        .clone()
        .json()
        .catch(() => ({}))
      if (body?.code === 'EMAIL_TAKEN') {
        throw new EmailTakenError(body.message ?? '')
      }
    }
    if (!res.ok) {
      await handleHttpErrorFromServer(
        res,
        {
          400: {
            title: i18n.t('auth:apiTitles.invalidInfoTitle'),
            message: i18n.t('auth:apiTitles.invalidInfoMessage'),
          },
          429: i18n.t('auth:apiTitles.tooManyAttemptsTitle'),
        },
        i18n.t('guest:errors.upgradeTitle'),
      )
    }
    return res.json()
  },
}
