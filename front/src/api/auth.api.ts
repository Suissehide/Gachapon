import { AUTH_ROUTES } from '../constants/auth.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import i18n, { withAcceptLanguage } from '../i18n/index.ts'
import {
  handleHttpError,
  handleHttpErrorFromServer,
} from '../libs/httpErrorHandler.ts'
import type { RegisterInput, User } from '../types/auth.ts'

export class EmailNotVerifiedError extends Error {
  email: string
  constructor(email: string) {
    super('EMAIL_NOT_VERIFIED')
    this.name = 'EmailNotVerifiedError'
    this.email = email
  }
}

export const AuthApi = {
  login: async (email: string, password: string): Promise<User> => {
    const response = await fetch(`${apiUrl}${AUTH_ROUTES.login}`, {
      method: 'POST',
      credentials: 'include',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      if (response.status === 403) {
        const body = await response.json().catch(() => ({}))
        if (body?.code === 'EMAIL_NOT_VERIFIED') {
          throw new EmailNotVerifiedError(body.email ?? email)
        }
      }
      // 400 : la seule source est la validation Zod du corps (email/mot de
      // passe), dont le message est technique et anglais — le front garde le
      // sien. 401 : `auth.invalidCredentials` du catalogue back, bilingue.
      await handleHttpErrorFromServer(
        response,
        {
          400: {
            title: i18n.t('auth:apiTitles.invalidFormatTitle'),
            message: i18n.t('auth:apiTitles.invalidFormatMessage'),
          },
          401: i18n.t('auth:apiTitles.invalidCredentialsTitle'),
        },
        i18n.t('auth:apiTitles.operations.login'),
      )
    }
    return response.json()
  },

  refresh: async (): Promise<Response> => {
    const response = await fetch(`${apiUrl}${AUTH_ROUTES.refresh}`, {
      method: 'POST',
      credentials: 'include',
      headers: withAcceptLanguage(),
    })
    if (!response.ok) {
      handleHttpError(response, {}, i18n.t('auth:apiTitles.operations.refresh'))
    }
    return response
  },

  register: async (registerInput: RegisterInput): Promise<Response> => {
    const response = await fetch(`${apiUrl}${AUTH_ROUTES.register}`, {
      method: 'POST',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(registerInput),
    })
    if (!response.ok) {
      // 409 : le back distingue `auth.emailAlreadyInUse` et
      // `user.usernameTaken` ; la copie française qui vivait ici parlait
      // d'email dans les deux cas, donc mentait sur un pseudo déjà pris.
      await handleHttpErrorFromServer(
        response,
        {
          400: {
            title: i18n.t('auth:apiTitles.invalidInfoTitle'),
            message: i18n.t('auth:apiTitles.invalidInfoMessage'),
          },
          409: i18n.t('auth:apiTitles.accountExistsTitle'),
        },
        i18n.t('auth:apiTitles.operations.register'),
      )
    }
    return response
  },

  verifyEmail: async (token: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.verifyEmail}`, {
      method: 'POST',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      credentials: 'include',
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          400: {
            title: i18n.t('auth:apiTitles.invalidLinkTitle'),
            message: i18n.t('auth:apiTitles.invalidLinkMessage'),
          },
        },
        i18n.t('auth:apiTitles.operations.verifyEmail'),
      )
    }
  },

  resendVerification: async (email: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.resendVerification}`, {
      method: 'POST',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          429: {
            title: i18n.t('auth:apiTitles.tooManyAttemptsTitle'),
            message: i18n.t('auth:apiTitles.resendCooldownMessage'),
          },
        },
        i18n.t('auth:apiTitles.operations.resendVerification'),
      )
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.forgotPassword}`, {
      method: 'POST',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          429: {
            title: i18n.t('auth:apiTitles.tooManyAttemptsTitle'),
            message: i18n.t('auth:apiTitles.forgotPasswordCooldownMessage'),
          },
        },
        i18n.t('auth:apiTitles.operations.forgotPassword'),
      )
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.resetPassword}`, {
      method: 'POST',
      headers: withAcceptLanguage({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ token, newPassword }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          400: {
            title: i18n.t('auth:apiTitles.invalidLinkTitle'),
            message: i18n.t('auth:apiTitles.invalidLinkMessage'),
          },
        },
        i18n.t('auth:apiTitles.operations.resetPassword'),
      )
    }
  },
}
