const KEY = 'gachapon.seenSettledDuels'

/**
 * Les duels réglés dont le joueur a déjà lu le résultat.
 *
 * Pourquoi le navigateur et pas la base : la liste des duels réglés vient du
 * serveur (`GET /me/duels`), seul l'accusé de lecture est local. Une colonne
 * `seenAt` supposerait une migration, une route de marquage et une
 * invalidation, pour un simple « j'ai vu ». Limite assumée en échange : le
 * marquage ne suit pas le joueur d'un navigateur à l'autre.
 *
 * La croissance est bornée par la fenêtre serveur — un duel réglé sort de
 * `/me/duels` au bout de 48 h — donc on élague à la lecture sur ce que le
 * serveur annonce encore.
 *
 * Chaque accès est protégé : `localStorage` lève dans un contexte restreint
 * (navigation privée stricte, stockage bloqué), et la pastille doit
 * s'afficher quand même.
 */
export function readSeenDuels(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter(isString) : [])
  } catch {
    return new Set()
  }
}

/** Marque un duel comme lu, en élaguant ce que le serveur n'annonce plus. */
export function markDuelSeen(duelId: string, stillAnnounced: string[]): void {
  try {
    const kept = new Set(
      [...readSeenDuels(), duelId].filter(
        (id) => stillAnnounced.includes(id) || id === duelId,
      ),
    )
    localStorage.setItem(KEY, JSON.stringify([...kept]))
  } catch {
    /* stockage indisponible : le duel réapparaîtra, ce n'est pas grave */
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}
