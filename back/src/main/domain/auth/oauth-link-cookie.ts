const SEPARATOR = ':'

/** Sous-ensemble de `fastify.UnsignResult` utile ici — évite une dépendance
 * de type sur `@fastify/cookie` dans une fonction pure. */
type SignedCookie = { valid: boolean; value: string | null }

/**
 * Valeur signée posée dans le cookie `oauth_link` par `/authorize?mode=link`
 * : lie l'invité au `state` de CE round-trip OAuth précis. Sans ce lien, un
 * flux de liaison abandonné (state A) laisserait le cookie vivant jusqu'à
 * `maxAge` (10 min), et une connexion Google/Discord normale ultérieure
 * (state B, même fenêtre) verrait son compte OAuth rattaché à l'invité au
 * lieu de simplement se connecter — pire, sur un poste partagé, au compte
 * OAuth d'une AUTRE personne (revue de la tâche 6).
 */
export function encodeLinkCookie(userId: string, state: string): string {
  return `${userId}${SEPARATOR}${state}`
}

/** Décode sans vérifier le `state` — utilisé pour reporter la liaison sur un
 * nouveau `state` (repli `access_denied` de Discord). */
export function decodeLinkCookie(
  unsignResult: SignedCookie | null,
): { userId: string; state: string } | undefined {
  if (!unsignResult?.valid || !unsignResult.value) {
    return undefined
  }
  const idx = unsignResult.value.lastIndexOf(SEPARATOR)
  if (idx === -1) {
    return undefined
  }
  return {
    userId: unsignResult.value.slice(0, idx),
    state: unsignResult.value.slice(idx + 1),
  }
}

/**
 * N'accepte le `userId` porté par le cookie que si son `state` correspond au
 * `state` du callback en cours (déjà vérifié par ailleurs contre le cookie
 * `oauth_state`). Un cookie orphelin, ou rejoué avec un autre `state`, est
 * ignoré silencieusement : le callback se déroule alors comme une connexion
 * normale.
 */
export function resolveLinkUserId(
  unsignResult: SignedCookie | null,
  callbackState: string,
): string | undefined {
  const decoded = decodeLinkCookie(unsignResult)
  return decoded && decoded.state === callbackState ? decoded.userId : undefined
}
