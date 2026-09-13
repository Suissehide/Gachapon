import { z } from 'zod/v4'

export const wagersTeamParamSchema = z.object({ id: z.string() })

export const duelParamSchema = z.object({
  id: z.string(),
  duelId: z.string(),
})

export const proposeDuelBodySchema = z.object({
  opponentId: z.string(),
})

const wagerUserMiniSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
})

const duelStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'SETTLED',
  'EXPIRED',
  'DECLINED',
  'CANCELLED',
])

// Croisé champ par champ avec `DuelView`
// (types/domain/wagers/wagers.domain.interface.ts) : le provider Zod
// retire silencieusement du JSON toute clé absente d'ici.
export const duelViewSchema = z.object({
  id: z.string(),
  status: duelStatusSchema,
  challenger: wagerUserMiniSchema,
  opponent: wagerUserMiniSchema,
  pullCount: z.number().int(),
  challengerPulls: z.number().int(),
  opponentPulls: z.number().int(),
  challengerScore: z.number(),
  opponentScore: z.number(),
  createdAt: z.string(),
  acceptedAt: z.string().nullable(),
  deadlineAt: z.string().nullable(),
  settledAt: z.string().nullable(),
  winnerId: z.string().nullable(),
  // Alimente le « +N cartes » de l'historique regle. Sans cette ligne, le
  // champ existerait cote domaine et disparaitrait du JSON en silence.
  transferredCount: z.number().int(),
  myRole: z.enum(['CHALLENGER', 'OPPONENT', 'SPECTATOR']),
})

// Croisé champ par champ avec `DuelTransferView`
// (types/domain/wagers/wagers.domain.interface.ts). `fromUserId` /
// `toUserId` ne sont PAS servis : le domaine les a déjà réduits au seul
// `toMe`, qui est tout ce que l'écran a besoin de savoir.
export const duelTransfersResponseSchema = z.object({
  transfers: z.array(
    z.object({
      id: z.string(),
      variant: z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC']),
      toMe: z.boolean(),
      card: z.object({
        id: z.string(),
        name: z.string(),
        rarity: z.enum(['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY']),
        element: z
          .enum(['FIRE', 'WATER', 'NATURE', 'EARTH', 'LIGHT', 'DARK'])
          .nullable(),
        imageUrl: z.string().nullable(),
        set: z.object({ name: z.string() }),
      }),
    }),
  ),
})

const cardRaritySchema = z.enum([
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
])

const cardElementSchema = z.enum([
  'FIRE',
  'WATER',
  'NATURE',
  'EARTH',
  'LIGHT',
  'DARK',
])

const cardVariantSchema = z.enum(['NORMAL', 'BRILLIANT', 'HOLOGRAPHIC'])

const duelHandSchema = z.object({
  id: z.string(),
  username: z.string(),
  avatar: z.string().nullable(),
  score: z.number(),
  pulls: z.array(
    z.object({
      id: z.string(),
      cardId: z.string(),
      name: z.string(),
      setName: z.string(),
      rarity: cardRaritySchema,
      element: cardElementSchema.nullable(),
      imageUrl: z.string().nullable(),
      variant: cardVariantSchema,
      pulledAt: z.string(),
    }),
  ),
})

// Croisé champ par champ avec `DuelHandsView`
// (types/domain/wagers/wagers.domain.interface.ts).
export const duelHandsResponseSchema = z.object({
  duelId: z.string(),
  teamId: z.string(),
  winnerId: z.string().nullable(),
  settledAt: z.string().nullable(),
  challenger: duelHandSchema,
  opponent: duelHandSchema,
})

const settledDuelSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  team: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    avatar: z.string().nullable(),
  }),
  challenger: wagerUserMiniSchema,
  opponent: wagerUserMiniSchema,
  challengerScore: z.number(),
  opponentScore: z.number(),
  winnerId: z.string().nullable(),
  settledAt: z.string().nullable(),
  transferredCount: z.number().int(),
})

// Croisé champ par champ avec `PendingDuelView`
// (types/domain/wagers/wagers.domain.interface.ts) : le provider Zod retire
// silencieusement du JSON toute clé absente d'ici.
export const myPendingDuelsResponseSchema = z.object({
  duels: z.array(
    z.object({
      id: z.string(),
      teamId: z.string(),
      team: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        avatar: z.string().nullable(),
      }),
      challenger: wagerUserMiniSchema,
      pullCount: z.number().int(),
      createdAt: z.string(),
      expiresAt: z.string(),
    }),
  ),
  settled: z.array(settledDuelSchema),
})

const betStatusSchema = z.enum(['ACTIVE', 'WON', 'LOST', 'EXPIRED'])

// Corps du placement d'un pari. Il n'y a VOLONTAIREMENT aucun champ de cote
// ni de probabilité : la cote est recalculée par le serveur au placement, et
// on ne veut pas même offrir une clé où le client pourrait l'annoncer.
// Croisé champ par champ avec `TargetedBetView`
// (types/domain/wagers/wagers.domain.interface.ts) : le provider Zod retire
// silencieusement du JSON toute clé absente d'ici.
export const myTargetedBetsResponseSchema = z.object({
  bets: z.array(
    z.object({
      id: z.string(),
      teamId: z.string(),
      team: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string(),
        avatar: z.string().nullable(),
      }),
      bettor: wagerUserMiniSchema,
      minRarity: cardRaritySchema,
      poolYes: z.number().int(),
      poolNo: z.number().int(),
      pullWindow: z.number().int(),
      pullsSeen: z.number().int(),
      createdAt: z.string(),
      deadlineAt: z.string(),
    }),
  ),
})

// `YES` par défaut des deux côtés : un client qui ne connaît pas encore le
// sens continue de parier que la cible atteindra la rareté, comme avant.
const betSideSchema = z.enum(['YES', 'NO'])

// Pas de `side` : celui qui OUVRE un marché pose la proposition, donc tient
// le « oui ». Le camp adverse se prend en renchérissant.
export const placeBetBodySchema = z.object({
  targetId: z.string(),
  minRarity: cardRaritySchema,
  stake: z.number().int(),
})

/** Renchérir sur un marché déjà ouvert : on choisit son camp et sa mise. */
export const joinBetBodySchema = z.object({
  side: betSideSchema,
  stake: z.number().int(),
})

export const betParamSchema = z.object({
  id: z.string(),
  betId: z.string(),
})

// Pas de `side` : le devis sert à OUVRIR un marché, et celui qui ouvre tient
// le « oui ». Les cotes des deux camps d'un marché existant voyagent sur sa
// vue (`oddsYes` / `oddsNo`), recalculées à chaque mise.
export const betQuoteQuerySchema = z.object({
  targetId: z.string(),
  minRarity: cardRaritySchema,
})

export const betQuoteResponseSchema = z.object({
  multiplier: z.number(),
  probability: z.number(),
  pullWindow: z.number().int(),
  minStake: z.number().int(),
  maxStake: z.number().int(),
})

// Croisé champ par champ avec `BetView`
// (types/domain/wagers/wagers.domain.interface.ts) : le provider Zod retire
// silencieusement du JSON toute clé absente d'ici.
export const betEntrySchema = z.object({
  id: z.string(),
  user: wagerUserMiniSchema,
  side: betSideSchema,
  stake: z.number().int(),
  payout: z.number().int(),
})

export const betViewSchema = z.object({
  id: z.string(),
  status: betStatusSchema,
  bettor: wagerUserMiniSchema,
  target: wagerUserMiniSchema,
  minRarity: cardRaritySchema,
  pullWindow: z.number().int(),
  probability: z.number(),
  poolYes: z.number().int(),
  poolNo: z.number().int(),
  oddsYes: z.number(),
  oddsNo: z.number(),
  open: z.boolean(),
  entries: z.array(betEntrySchema),
  createdAt: z.string(),
  deadlineAt: z.string(),
  settledAt: z.string().nullable(),
  pullsSeen: z.number().int(),
  myRole: z.enum(['BETTOR', 'TARGET', 'SPECTATOR']),
  mySide: betSideSchema.nullable(),
  myStake: z.number().int(),
  myPayout: z.number().int(),
})

export const wagersViewResponseSchema = z.object({
  duels: z.array(duelViewSchema),
  settledDuels: z.array(duelViewSchema),
  bets: z.array(betViewSchema),
  settledBets: z.array(betViewSchema),
  engagedCardIds: z.array(z.string()),
})
