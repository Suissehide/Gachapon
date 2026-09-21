import { getCurrentLocale } from '../locale-context'
import { EN_MESSAGES } from './en'
import { FR_MESSAGES } from './fr'
import type { ErrorMessageKey } from './keys'

export type { ErrorMessageKey }
export { EN_MESSAGES, FR_MESSAGES }

/**
 * Résout un message d'erreur dans la locale courante de la requête (voir
 * `getCurrentLocale()`). Aucun repli vers l'autre langue si une variable
 * d'interpolation manque : le placeholder `{{nom}}` reste visible tel quel,
 * délibérément — un trou doit se voir plutôt que produire un message tronqué
 * ou trompeur (voir global-constraints.md).
 */
export function errorMessage(
  key: ErrorMessageKey,
  vars?: Record<string, string | number>,
): string {
  const catalogue = getCurrentLocale() === 'FR' ? FR_MESSAGES : EN_MESSAGES
  let message: string = catalogue[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      message = message.replaceAll(`{{${name}}}`, String(value))
    }
  }
  return message
}
