import type { PostgresPrismaClient } from '../../../infra/orm/postgres-client'

/**
 * Le type Prisma brut (`import type { Quest } from '../generated/client'`)
 * ignore les champs calculés de l'extension. Ces alias-ci les portent : ce
 * sont eux que les interfaces de repositories doivent utiliser.
 */
export type LocalizedQuest = Awaited<
  ReturnType<PostgresPrismaClient['quest']['findUniqueOrThrow']>
>
