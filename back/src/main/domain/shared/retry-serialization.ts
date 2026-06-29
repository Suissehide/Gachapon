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
export function isPrismaSerializationError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'P2034'
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
