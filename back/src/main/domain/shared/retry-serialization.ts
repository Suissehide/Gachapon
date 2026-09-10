/**
 * Prisma raises code `P2034` when a Serializable transaction aborts due to a
 * write skew with another concurrent transaction. The conventional fix is to
 * retry the whole transaction a small number of times — the racing operations
 * almost always succeed on the second attempt.
 *
 * Used by every domain that opens a Serializable transaction touching the
 * `User` row (or any other contended row): gacha, card-leveling,
 * card-ascension, card-dust-conversion, combat-team, combat-points,
 * equipment, campaign.
 */
/**
 * Deux formes selon la façon dont Prisma parle à Postgres :
 *
 *  - `code === 'P2034'`, la forme historique (moteur natif) ;
 *  - un `DriverAdapterError` dont la cause porte
 *    `kind === 'TransactionWriteConflict'` — c'est CETTE forme que
 *    `@prisma/adapter-pg` remonte sous Prisma 7, et elle ne porte aucun
 *    `code`. Ne reconnaître que la première revenait à ne jamais retenter :
 *    le conflit de sérialisation sortait en 500 au lieu d'être rejoué, sur
 *    tous les chemins contendus (tirage, règlement de pari, proposition de
 *    duel).
 */
export function isPrismaSerializationError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) {
    return false
  }
  if ((err as { code?: unknown }).code === 'P2034') {
    return true
  }
  const cause = (err as { cause?: { kind?: unknown } }).cause
  if (
    typeof cause === 'object' &&
    cause !== null &&
    cause.kind === 'TransactionWriteConflict'
  ) {
    return true
  }
  return (
    (err as { name?: unknown }).name === 'DriverAdapterError' &&
    typeof (err as { message?: unknown }).message === 'string' &&
    (err as { message: string }).message.includes('TransactionWriteConflict')
  )
}

const DEFAULT_MAX_RETRIES = 3

/**
 * Attente entre deux tentatives : exponentielle, plafonnée, et à moitié
 * ALÉATOIRE.
 *
 * Rejouer immédiatement, c'est rejouer EN MÊME TEMPS. Deux transactions qui
 * viennent d'aborter l'une sur l'autre repartent au même instant, se
 * disputent la même ligne et s'annulent à nouveau : au-delà de deux ou trois
 * écrivains simultanés sur la même ligne (le compteur d'XP d'une équipe, un
 * soir, sur trente-cinq membres), les rejeux s'épuisent et l'appel échoue.
 * Le délai désynchronise les concurrents, le jitter les empêche de se
 * resynchroniser au rejeu suivant.
 *
 * La moitié fixe garantit un écart minimal (deux tirages aléatoires proches
 * ne ramènent pas les deux rejeux au même instant), la moitié aléatoire
 * décorrèle. Les bornes restent petites — 15 ms de base, 120 ms de
 * plafond — parce que ces transactions sont courtes et qu'elles portent des
 * requêtes HTTP que personne ne doit attendre : au pire trois attentes,
 * moins d'un quart de seconde en tout.
 */
const BASE_DELAY_MS = 15
const MAX_DELAY_MS = 120

export function serializationBackoffMs(
  attempt: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt)
  return Math.round(ceiling / 2 + random() * (ceiling / 2))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Wrap a TX-running thunk so that a Prisma `P2034` serialization failure is
 * retried up to `maxRetries` times, waiting a short jittered backoff between
 * attempts. Any other error propagates immediately.
 */
export async function retryOnSerialization<T>(
  thunk: () => Promise<T>,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<T> {
  let attempt = 0
  // We intentionally re-throw the original error after exhaustion so the
  // route layer surfaces the underlying cause.
  while (true) {
    try {
      return await thunk()
    } catch (err) {
      if (attempt < maxRetries && isPrismaSerializationError(err)) {
        await sleep(serializationBackoffMs(attempt))
        attempt += 1
        continue
      }
      throw err
    }
  }
}
