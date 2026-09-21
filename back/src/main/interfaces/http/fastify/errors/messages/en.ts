import type { ErrorMessageKey } from './keys'

/**
 * Catalogue anglais des messages d'erreur. Typé en `Record<ErrorMessageKey,
 * string>` sur le référentiel de clés du français (voir `keys.ts`) : une clé
 * oubliée ici casse `npm run build`, par construction — aucun repli vers le
 * français pour le texte de code, contrairement au contenu de jeu.
 */
export const EN_MESSAGES: Record<ErrorMessageKey, string> = {
  'user.notFound': 'User not found',
  'team.maxTeamsPerUser': 'Maximum {{max}} teams per user',
}
