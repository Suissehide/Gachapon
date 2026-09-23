// Fixture inter-garde-fous — l'angle mort assumé du masque `t('…')`.
//
// `check-i18n-hardcoded.mjs` masque l'argument littéral de `t()` : il ne voit
// donc PAS le français passé comme clé. `check-i18n-keys.mjs`, lui, le
// signale (la clé n'existe dans aucun JSON). Cette fixture fige ce partage
// des rôles : si l'un des deux change, le self-test tombe. Voir l'en-tête de
// `displayed-text.tsx` pour le statut de ces fixtures.
//
// NE PAS REFORMATER.

import { useTranslation } from 'react-i18next'

export function FrenchAsKey() {
  const { t } = useTranslation('common')
  return <button type="button">{t('Aucune carte disponible pour vous')}</button>
}
