const KEY = 'gachapon.seenAcceptedJoinRequests'

/**
 * Les candidatures acceptées dont le joueur a déjà vu l'annonce dans la
 * cloche.
 *
 * Même stockage que `seenDuels.ts` — le serveur ne porte pas d'accusé de
 * lecture, seul le local en garde trace — mais SANS l'élagage par liste
 * « encore annoncée » : un duel réglé se répète à haute fréquence, une
 * candidature acceptée non — un joueur est plafonné à 3 équipes, l'événement
 * est rare sur toute la durée de vie d'un compte. Le stockage ne peut donc
 * pas croître de façon significative même sans jamais purger les entrées
 * dont l'équipe est sortie de la fenêtre de 7 jours du serveur.
 *
 * Chaque accès est protégé : `localStorage` lève dans un contexte restreint
 * (navigation privée stricte, stockage bloqué), et la pastille doit
 * s'afficher quand même.
 */
export function readSeenJoins(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter(isString) : [])
  } catch {
    return new Set()
  }
}

/** Marque une candidature acceptée comme lue. */
export function markJoinSeen(requestId: string): void {
  try {
    const kept = new Set([...readSeenJoins(), requestId])
    localStorage.setItem(KEY, JSON.stringify([...kept]))
  } catch {
    /* stockage indisponible : l'annonce réapparaîtra, ce n'est pas grave */
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
