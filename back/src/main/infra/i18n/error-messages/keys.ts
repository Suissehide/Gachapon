import type { FR_MESSAGES } from './fr'

/**
 * Le français sert de référentiel de clés — pas de langue de repli, à la
 * différence du contenu de jeu (voir `localized.extension.ts`). Typer
 * `EN_MESSAGES` en `Record<ErrorMessageKey, string>` rend toute clé oubliée
 * en anglais impossible à compiler : c'est tout l'intérêt du dispositif, pas
 * un détail d'implémentation.
 */
export type ErrorMessageKey = keyof typeof FR_MESSAGES
