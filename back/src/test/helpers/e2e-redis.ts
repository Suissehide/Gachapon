/**
 * L'index Redis propre a un run e2e.
 *
 * Isoler la base Postgres ne suffit pas : `configService` cache ses valeurs
 * sous des cles `config:*` dans Redis, et `globalSetup` faisait un `flushdb`.
 * Deux runs partageant un index se videraient donc encore le cache — pire, un
 * `configService.set` de l'un servirait une valeur que la base de l'autre ne
 * contient pas. C'est le canal partage qu'on raterait en ne voyant que
 * Postgres.
 *
 * La reservation vit dans l'index 0, que personne n'utilise pour les tests.
 */

export type RedisClaimClient = {
  /** `SET key value NX` : vrai si la cle a ete posee, faux si elle existait. */
  setNx: (key: string, value: string) => Promise<boolean>
  get: (key: string) => Promise<string | null>
  del: (key: string) => Promise<void>
}

/** Redis expose 16 index par defaut ; 0 sert aux reservations. */
const FIRST_INDEX = 1
const LAST_INDEX = 15

export function claimKey(index: number): string {
  return `e2e:redis-index:${index}`
}

/**
 * Reserve le premier index libre et renvoie son numero.
 *
 * Un index tenu par un processus MORT est repris : un run tue ne rend pas le
 * sien, et sans cette reprise les index s'epuiseraient a chaque incident.
 * Quand ils sont tous pris par des runs vivants, on leve — mieux vaut un echec
 * nomme qu'un run qui partagerait silencieusement son cache avec un autre.
 */
export async function claimRedisIndex(
  redis: RedisClaimClient,
  pid: number,
  isAlive: (pid: number) => boolean,
): Promise<number> {
  for (let index = FIRST_INDEX; index <= LAST_INDEX; index += 1) {
    const key = claimKey(index)
    if (await redis.setNx(key, String(pid))) {
      return index
    }
    const holder = Number(await redis.get(key))
    if (!Number.isInteger(holder) || holder <= 0 || !isAlive(holder)) {
      await redis.del(key)
      if (await redis.setNx(key, String(pid))) {
        return index
      }
    }
  }
  throw new Error(
    `Aucun index Redis libre entre ${FIRST_INDEX} et ${LAST_INDEX} : ` +
      `autant de runs e2e tournent deja. Attends qu'un run se termine.`,
  )
}

/** Rend l'index — et seulement s'il nous appartient encore. */
export async function releaseRedisIndex(
  redis: RedisClaimClient,
  index: number,
  pid: number,
): Promise<void> {
  const key = claimKey(index)
  if ((await redis.get(key)) === String(pid)) {
    await redis.del(key)
  }
}
