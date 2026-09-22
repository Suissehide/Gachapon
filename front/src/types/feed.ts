import type { Locale } from '../i18n/index.ts'

export type FeedEntry = {
  username: string
  /**
   * Nom résolu côté back dans SA langue par défaut (indépendante de la
   * locale du viewer) — conservé uniquement pour compatibilité avec le
   * contrat WS partagé et la réponse REST `/pulls/recent` (qui, elle, n'a
   * pas encore les champs bilingues ci-dessous, amendement A2 du lot 1).
   * Ne pas lire directement pour l'affichage : passer par
   * `localizedFeedCardName`.
   */
  cardName: string
  /** Présent sur `feed:pull` (WS) ; absent sur `/pulls/recent` (REST). */
  cardNameFr?: string
  /** Présent sur `feed:pull` (WS) ; absent sur `/pulls/recent` (REST). */
  cardNameEn?: string
  rarity: string
  variant: string
  cardId: string
  imageUrl: string | null
  /** Voir `cardName` — ne pas lire directement, passer par `localizedFeedSetName`. */
  setName: string
  /** Présent sur `feed:pull` (WS) ; absent sur `/pulls/recent` (REST). */
  setNameFr?: string
  /** Présent sur `feed:pull` (WS) ; absent sur `/pulls/recent` (REST). */
  setNameEn?: string
  pulledAt: string
}

/**
 * Nom de carte à afficher selon la locale courante. Se replie sur `cardName`
 * (langue par défaut du back) quand les champs bilingues sont absents — cas
 * des entrées venues de `/pulls/recent` (REST), qui n'a pas encore été migré
 * (amendement A2 : seul `feed:pull` porte les deux langues pour l'instant).
 */
export function localizedFeedCardName(
  entry: FeedEntry,
  locale: Locale,
): string {
  return (
    (locale === 'fr' ? entry.cardNameFr : entry.cardNameEn) ?? entry.cardName
  )
}

/** Voir `localizedFeedCardName` — même repli pour le nom de set. */
export function localizedFeedSetName(entry: FeedEntry, locale: Locale): string {
  return (locale === 'fr' ? entry.setNameFr : entry.setNameEn) ?? entry.setName
}
