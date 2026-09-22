import i18n from '../i18n/index.ts'

export type ApiErrorInfo = {
  title: string
  message: string
}
export type ErrorMessages = Partial<Record<number, ApiErrorInfo>>

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError
}

export function handleHttpError(
  response: Response,
  overrides: ErrorMessages = {},
  defaultMessage = i18n.t('errors:generic.defaultMessage'),
) {
  const status = response.status
  const custom = overrides[status]

  throw new ApiError(status, defaultMessage, custom)
}

/**
 * Variante async de `handleHttpError` : lit le corps JSON de la réponse et
 * préfère le `message` du serveur (déjà bilingue — `errorMessage()` côté
 * back résout la locale depuis `Accept-Language`, voir `i18n/index.ts`)
 * plutôt qu'une seconde copie traduite à la main côté front. Réservée aux
 * endpoints dont les messages d'erreur doublonnaient le catalogue back
 * (`teams.api.ts`, `wagers.api.ts` — voir task-6-report.md) : les autres
 * fichiers `api/*.api.ts` gardent `handleHttpError` tel quel.
 *
 * `titleOverrides` ne couvre QUE le titre du toast (court, propre à l'UX) —
 * jamais le message, qui vient du corps de la réponse ou, à défaut, du
 * catalogue générique par statut ci-dessus.
 */
export async function handleHttpErrorFromServer(
  response: Response,
  titleOverrides: Partial<Record<number, string>> = {},
  fallbackTitle?: string,
): Promise<never> {
  const status = response.status
  let serverMessage: string | undefined
  try {
    const body: unknown = await response.clone().json()
    if (
      body &&
      typeof body === 'object' &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      serverMessage = (body as { message: string }).message
    }
  } catch {
    // Corps non JSON (page d'erreur HTML, réponse vide…) — on retombe sur
    // le message générique par statut, géré par ApiError.defaultErrorCases.
  }

  throw new ApiError(
    status,
    fallbackTitle ?? i18n.t('errors:generic.defaultMessage'),
    {
      title: titleOverrides[status],
      message: serverMessage,
    },
  )
}

export class ApiError extends Error {
  status: number
  title: string

  constructor(
    status: number,
    defaultMessage: string,
    override?: Partial<ApiErrorInfo>,
  ) {
    const base = ApiError.defaultErrorCases(status, defaultMessage)
    const final = {
      title: override?.title ?? defaultMessage ?? base.title,
      message: override?.message ?? base.message,
    }

    super(final.message)

    this.name = 'ApiError'
    this.status = status
    this.title = final.title
  }

  static defaultErrorCases(
    status: number,
    defaultMessage: string,
  ): ApiErrorInfo {
    switch (status) {
      case 0:
        return {
          title: i18n.t('errors:status.0.title'),
          message: i18n.t('errors:status.0.message'),
        }
      case 400:
        return {
          title: i18n.t('errors:status.400.title'),
          message: i18n.t('errors:status.400.message'),
        }
      case 401:
        return {
          title: i18n.t('errors:status.401.title'),
          message: i18n.t('errors:status.401.message'),
        }
      case 403:
        return {
          title: i18n.t('errors:status.403.title'),
          message: i18n.t('errors:status.403.message'),
        }
      case 402:
        return {
          title: i18n.t('errors:status.402.title'),
          message: i18n.t('errors:status.402.message'),
        }
      case 404:
        return {
          title: i18n.t('errors:status.404.title'),
          message: i18n.t('errors:status.404.message'),
        }
      case 500:
        return {
          title: i18n.t('errors:status.500.title'),
          message: i18n.t('errors:status.500.message'),
        }
      default:
        return {
          title: i18n.t('errors:generic.fallbackTitle'),
          message: defaultMessage || i18n.t('errors:generic.fallbackMessage'),
        }
    }
  }
}
