// Fixture du garde-fou — POSITIONS NON AFFICHÉES, doivent rester SILENCIEUSES.
//
// Chaque ligne de ce fichier reproduit un faux positif RÉEL corrigé par la
// tâche 12, avec le fichier d'origine en regard. Voir l'en-tête de
// `displayed-text.tsx` pour le statut de ces fixtures.
//
// `className` et `data-*` NE SONT PAS ici : ils ne bénéficient d'aucun
// masque, par décision de revue. Voir `unmasked-attributes.tsx`.
//
// NE PAS REFORMATER.

import { useTranslation } from 'react-i18next'

export function NotDisplayed() {
  const { t } = useTranslation('guide')
  const compact = true
  return (
    <div id="campagne">
      <label htmlFor="tirages-du-jour">x</label>
      {/* routes/guide.tsx — segment de clé, jamais affiché */}
      <h2>{t('sectionLabels.campagne')}</h2>
      <p>{t('sections.cartes.tip')}</p>
      <Trans t={t} i18nKey="sections.campagne.intro" />
      {/* tcg-card/TcgCardFace.tsx:354 — commentaire dans une interpolation */}
      <span
        style={{
          top: `${
            // Sur une vignette compacte, un retrait de 12 px mange les cartes
            compact ? 1 : 3
          }px`,
        }}
      />
    </div>
  )
}
