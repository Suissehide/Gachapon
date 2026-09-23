// Fixture du garde-fou — LES {{var}} DE LA TRADUCTION CONTRE LES OPTIONS DU
// SITE D'APPEL.
//
// POURQUOI (revue finale de branche). Quatre nœuds de l'arbre de compétences
// affichaient « +{{value}} jetons » en clair sur /skills, dans les deux
// langues : le site d'appel passait `{ count: v }` à une clé qui interpole
// `{{value}}`. Aucun des quatre garde-fous ne pouvait l'attraper — la parité
// compare fr et en, qui étaient d'accord sur l'erreur ; le contrôle des clés
// ne testait que l'EXISTENCE (et son `count: 1` résolvait le pluriel sans
// jamais toucher à l'interpolation) ; le détecteur de français ne voyait
// aucun français ; et `t()` accepte n'importe quel objet d'options sans que
// TypeScript s'en émeuve.
//
// Ce fichier fige la morsure du contrôle ajouté à `check-i18n-keys.mjs` :
// chaque ligne ci-dessous est soit un défaut qui DOIT sortir, soit une forme
// correcte qui DOIT rester muette. Les deux moitiés comptent autant : un
// contrôle assoupli se reconnaît à une ligne qui cesse de sortir, un
// contrôle devenu bavard à une ligne qui se met à sortir.
//
// Toutes les clés citées sont de VRAIES clés des ressources du dépôt — le
// contrôle résout contre `src/i18n/locales/`, pas contre une copie. Si l'une
// d'elles disparaît ou perd son `{{value}}`, cette fixture tombe : c'est
// voulu, elle sera alors à ré-ancrer sur une clé équivalente.
//
// NE PAS REFORMATER : les numéros de ligne sont le contrat de
// `check-i18n-guard-selftest.mjs`.

export function InterpolationOptions({ n }: { n: number }) {
  const { t } = useTranslation('skills')
  const fromElsewhere = { value: n }
  return (
    <div>
      {/* DOIVENT SORTIR — une {{var}} sans option de ce nom. */}
      <p>{i18n.t('skills:formatters.TOKEN_VAULT', { count: n })}</p>
      <p>{t('skills:formatters.PC_VAULT', { count: n })}</p>
      <p>{t('skills:formatters.REGEN')}</p>
      <Trans i18nKey="collection:slotsPanel.equippedCount" count={n} />

      {/* DOIVENT RESTER MUETS — toute {{var}} a son option. */}
      <p>{i18n.t('skills:formatters.TOKEN_VAULT', { count: n, value: n })}</p>
      <p>{t('skills:formatters.REGEN', { value: n })}</p>
      <p>{t('skills:effectDescriptions.REGEN')}</p>
      <p>{t('skills:formatters.DUST_HARVEST', { value: n, count: n })}</p>
      <p>{t('skills:formatters.DUST_HARVEST', { value: n, leftover: n })}</p>
      <Trans
        i18nKey="collection:slotsPanel.equippedCount"
        count={n}
        values={{ total: n }}
      />

      {/* ANGLE MORT ASSUMÉ n°7 — options illisibles, donc non vérifiées. */}
      <p>{t('skills:formatters.REGEN', fromElsewhere)}</p>
      <p>{t('skills:formatters.REGEN', { ...fromElsewhere })}</p>
    </div>
  )
}
