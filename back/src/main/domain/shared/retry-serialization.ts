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
 * Wrap a TX-running thunk so that a Prisma `P2034` serialization failure is
 * retried up to `maxRetries` times. Any other error propagates immediately.
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
        attempt += 1
        continue
      }
      throw err
    }
  }
}
