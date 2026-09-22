import i18n from '../i18n/index.ts'

export type ApiErrorInfo = {
  title: string
  message: string
}
export type ErrorMessages = Partial<Record<number, ApiErrorInfo>>

/**
 * Un statut explicitement DÉCLARÉ par l'appelant de
 * `handleHttpErrorFromServer`, et qui dit qui possède le message affiché :
 *
 * - `string` — le SERVEUR le possède. La chaîne n'est que le titre du toast
 *   (le back n'en produit pas) ; le corps du message vient du `message` de la
 *   réponse, que `errorMessage()` a déjà résolu dans la langue de la requête.
 * - `ApiErrorInfo` — le FRONT le possède : titre ET message viennent d'ici.
 *   À réserver aux statuts où le serveur ne produit PAS de message du
 *   catalogue (validation Zod, limiteur de débit : voir les normalizers de
 *   `back/src/main/interfaces/http/fastify/errors/`, dont le texte est
 *   technique et unilingue anglais), ou à ceux où le message du front porte
 *   une consigne que le serveur n'a pas.
 */
export type ServerErrorOverride = string | ApiErrorInfo
export type ServerErrorMessages = Partial<Record<number, ServerErrorOverride>>

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
 * Variante async de `handleHttpError` : pour les statuts que l'appelant
 * déclare SERVEUR (voir `ServerErrorOverride`), lit le corps JSON de la
 * réponse et affiche le `message` que le back a déjà résolu dans la langue de
 * la requête, plutôt qu'une seconde copie traduite à la main côté front —
 * deux sources pour la même information finissent par diverger.
 *
 * Le message du serveur n'est lu QUE sur un statut déclaré. C'est la
 * condition qui rend ce repli sûr : le `message` d'une réponse d'erreur ne
 * vient pas toujours du catalogue bilingue. Selon le normalizer qui gagne
 * (`back/src/main/interfaces/http/fastify/errors/normalizers/`, premier
 * match : Prisma, puis Fastify, puis Boom), ce peut être une erreur de
 * validation Zod (`body/email Invalid email`), un message Prisma brut, ou le
 * `'Unknown error'` par défaut — tous techniques et unilingues anglais.
 * Déclarer un statut, c'est affirmer qu'un `Boom` de domaine le produit.
 * Un statut non déclaré retombe donc sur le message générique traduit de
 * `ApiError.defaultErrorCases` : conservateur du bon côté — jamais de texte
 * technique anglais dans un toast, au prix d'un message moins précis sur un
 * statut que l'appelant n'avait pas prévu.
 */
export async function handleHttpErrorFromServer(
  response: Response,
  overrides: ServerErrorMessages = {},
  fallbackTitle?: string,
): Promise<never> {
  const status = response.status
  const declared = overrides[status]
  const frontOwned = typeof declared === 'object' ? declared : undefined
  const serverOwned = typeof declared === 'string'

  let serverMessage: string | undefined
  if (serverOwned) {
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
      // Corps non JSON (page d'erreur HTML, réponse vide, serveur
      // injoignable…) — on retombe sur le message générique par statut, géré
      // par ApiError.defaultErrorCases. C'est le vrai repli : celui-là est
      // traduit côté front, puisque aucun serveur ne l'a produit.
    }
  }

  throw new ApiError(
    status,
    fallbackTitle ?? i18n.t('errors:generic.defaultMessage'),
    {
      title: serverOwned ? declared : frontOwned?.title,
      message: frontOwned?.message ?? serverMessage,
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
