import { AUTH_ROUTES } from '../constants/auth.constant.ts'
import { apiUrl } from '../constants/config.constant.ts'
import { handleHttpError } from '../libs/httpErrorHandler.ts'
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) {
      if (response.status === 403) {
        const body = await response.json().catch(() => ({}))
        if (body?.code === 'EMAIL_NOT_VERIFIED') {
          throw new EmailNotVerifiedError(body.email ?? email)
        }
      }
      handleHttpError(
        response,
        {
          400: {
            title: 'Format invalide',
            message: 'Vérifie ton email et ton mot de passe',
          },
          401: {
            title: 'Identifiants incorrects',
            message: "L'email ou le mot de passe est incorrect",
          },
        },
        'Impossible de se connecter',
      )
    }
    return response.json()
  },

  refresh: async (): Promise<Response> => {
    const response = await fetch(`${apiUrl}${AUTH_ROUTES.refresh}`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!response.ok) {
      handleHttpError(response, {}, 'Erreur lors de la mise à jour du cookie')
    }
    return response
  },

  register: async (registerInput: RegisterInput): Promise<Response> => {
    const response = await fetch(`${apiUrl}${AUTH_ROUTES.register}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerInput),
    })
    if (!response.ok) {
      handleHttpError(
        response,
        {
          400: {
            title: 'Informations invalides',
            message: 'Certains champs sont incorrects ou manquants',
          },
          409: {
            title: 'Compte existant',
            message: 'Un utilisateur avec cet email existe déjà',
          },
        },
        "Erreur lors de l'inscription",
      )
    }
    return response
  },

  verifyEmail: async (token: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.verifyEmail}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          400: {
            title: 'Lien invalide',
            message: 'Ce lien est invalide ou a expiré.',
          },
        },
        'Erreur de vérification',
      )
    }
  },

  resendVerification: async (email: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.resendVerification}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          429: {
            title: 'Trop de tentatives',
            message: 'Attends avant de renvoyer un email.',
          },
        },
        'Erreur lors du renvoi',
      )
    }
  },

  forgotPassword: async (email: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.forgotPassword}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          429: {
            title: 'Trop de tentatives',
            message: 'Attends 2 minutes avant de réessayer.',
          },
        },
        'Erreur lors de la demande',
      )
    }
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    const res = await fetch(`${apiUrl}${AUTH_ROUTES.resetPassword}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    })
    if (!res.ok) {
      handleHttpError(
        res,
        {
          400: {
            title: 'Lien invalide',
            message: 'Ce lien est invalide ou a expiré.',
          },
        },
        'Erreur lors de la réinitialisation',
      )
    }
  },
}
