export type MissingTranslationEntry = {
  entity: string
  id: string
  field: string
  /**
   * `empty` — une langue porte du contenu, l'autre est vide.
   * `identical` — les deux langues portent la MÊME valeur : la signature de
   * la recopie faite par la migration `20260921151247_i18n_content_columns`
   * et de tout import qui envoie `nameEn = nameFr`.
   */
  kind: 'empty' | 'identical'
  /** Langue à remplir. Toujours `EN` pour `identical` (voir `classify`). */
  missingLocale: 'FR' | 'EN'
  value: string
}

export interface IAdminTranslationsRepository {
  /**
   * Une ligne par paire Fr/En défectueuse sur les douze modèles traduits
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
   *
   * DEUXIÈME CATÉGORIE, `kind: 'identical'` : les deux langues pleines et
   * égales. C'est l'état que la migration a produit sur TOUTE la base —
   * elle a recopié le français dans la colonne anglaise, qui passait
   * `NOT NULL`, et non laissé une chaîne vide. Une détection bornée aux
   * paires déséquilibrées ne voyait donc rien de la production réelle :
   * après le bootstrap des définitions, les 17 familles de cartes
   * importées par l'API gardaient du français dans leur colonne anglaise
   * et la route renvoyait une liste vide.
   *
   * Les identités DÉLIBÉRÉES sont écartées de cette catégorie (prénoms
   * nus, cognats, gabarits bilingues) : voir
   * `domain/i18n/deliberate-identical.ts`, dérivé des définitions plutôt
   * que recopié à la main.
   */
  findMissingTranslations(): Promise<MissingTranslationEntry[]>
}
