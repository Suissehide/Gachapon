export type MissingTranslationEntry = {
  entity: string
  id: string
  field: string
  valueFr: string
}

export interface IAdminTranslationsRepository {
  /**
   * Une ligne par colonne anglaise vide sur les douze modèles traduits (voir
   * `localized.extension.ts`). Sur les colonnes obligatoires (`String`), une
   * colonne anglaise vide est déjà une anomalie en soi — la création via
   * l'API l'interdit, seule une donnée créée hors API (seed direct, script)
   * peut en produire une. Sur les colonnes facultatives (`String?` —
   * `CardSet.description`, `Reward.label`), une colonne vide des DEUX côtés
   * est un état normal (contenu jamais renseigné) : ne compte comme
   * traduction manquante que le cas où le français porte du contenu que
   * l'anglais n'a pas — sinon toute carte sans description remonterait ici.
   */
  findMissingTranslations(): Promise<MissingTranslationEntry[]>
}
