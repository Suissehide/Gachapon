// Fixture du garde-fou — POSITIONS NON AFFICHÉES, doivent rester SILENCIEUSES.
//
// Chaque ligne de ce fichier reproduit un faux positif RÉEL corrigé par la
// tâche 12, avec le fichier d'origine en regard. Voir l'en-tête de
// `displayed-text.tsx` pour le statut de ces fixtures.
//
// NE PAS REFORMATER.

import { useTranslation } from 'react-i18next'

export function NotDisplayed() {
  const { t } = useTranslation('guide')
  const compact = true
  return (
    <div
      id="campagne"
      className="flex des cartes pour vous"
      data-section="une valeur avec des mots"
      htmlFor="tirages-du-jour"
    >
      {/* routes/guide.tsx — segment de clé, jamais affiché */}
      <h2>{t('sectionLabels.campagne')}</h2>
      <p>{t('sections.cartes.tip')}</p>
      <Trans t={t} i18nKey="sections.campagne.intro" />
      {/* tcg-card/TcgCardFace.tsx:354 — commentaire dans une interpolation */}
      <span
        className={`absolute ${
          // Sur une vignette compacte, un retrait de 12 px mange les cartes
          compact ? 'top-1' : 'top-3'
        }`}
      />
    </div>
  )
}
