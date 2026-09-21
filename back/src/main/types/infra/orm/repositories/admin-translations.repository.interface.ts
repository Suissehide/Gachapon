export type MissingTranslationEntry = {
  entity: string
  id: string
  field: string
  missingLocale: 'FR' | 'EN'
  value: string
}

export interface IAdminTranslationsRepository {
  /**
   * Une ligne par paire Fr/En déséquilibrée sur les douze modèles traduits
   * (voir `localized.extension.ts`) : une des deux langues porte du
   * contenu, l'autre est vide. Détection BIDIRECTIONNELLE — français
   * manquant ou anglais manquant remontent tous les deux, `missingLocale`
   * dit lequel. Une première version ne regardait que le sens
   * historique (anglais manquant), en cohérence avec un contenu FR
   * backfillé sans traduction ; une fois l'API d'administration bilingue
   * (cette tâche), un admin peut tout aussi bien saisir l'anglais seul —
   * le trou inverse existe donc réellement et doit remonter aussi.
   *
   * Une paire dont les DEUX langues sont vides ne remonte JAMAIS : sur les
   * colonnes facultatives (`CardSet.description`, `Reward.label`), c'est
   * un état normal (contenu jamais renseigné, rien à traduire) — la
   * remonter noierait les vrais trous sous du bruit. Sur les colonnes
   * obligatoires, ce cas ne devrait pas exister (l'API l'interdit), donc
   * il n'y a pas de politique différente à appliquer : le même filtre
   * (« une langue pleine, l'autre vide ») couvre les deux types de
   * colonnes sans distinction de nullabilité.
   */
  findMissingTranslations(): Promise<MissingTranslationEntry[]>
}
