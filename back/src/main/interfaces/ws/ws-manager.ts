import type { WebSocket } from '@fastify/websocket'

type PullResultEvent = {
  type: 'pull:result'
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    variant: string
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
  xpGained: number
}

type PullBatchResultEvent = {
  type: 'pull:batch-result'
  pulls: Array<{
    card: {
      id: string
      name: string
      imageUrl: string | null
      rarity: string
      variant: string
      set: { id: string; name: string }
    }
    wasDuplicate: boolean
    dustEarned: number
    pityCurrent: number
  }>
  tokensRemaining: number
  xpGained: number
}

export type FeedPullEvent = {
  type: 'feed:pull'
  username: string
  cardName: string
  rarity: string
  variant: string
  cardId: string
  imageUrl: string | null
  setName: string
  pulledAt: string
}

export type AdminActivityEvent = {
  type: 'admin:activity'
  event: {
    id: string
    type: string
    payload: unknown
    createdAt: string
    user: { id: string; username: string } | null
  }
}

export type RaidAttackEvent = {
  type: 'raid:attack'
  teamId: string
  raidId: string
  hp: number
  maxHp: number
  attacker: { id: string; username: string }
  damage: number
  killed: boolean
}

export type DuelProposedEvent = {
  type: 'duel:proposed'
  teamId: string
  duelId: string
  challenger: { id: string; username: string }
}

export type DuelUpdateEvent = {
  type: 'duel:update'
  teamId: string
  duelId: string
  status: string
  challengerScore: number
  opponentScore: number
  challengerPulls: number
  opponentPulls: number
  pullCount: number
}

export type DuelSettledEvent = {
  type: 'duel:settled'
  teamId: string
  duelId: string
  winnerId: string | null
  transferredCount: number
}

export type BetPlacedEvent = {
  type: 'bet:placed'
  teamId: string
  betId: string
  bettor: { id: string; username: string }
  targetId: string
  minRarity: string
  stake: number
  multiplier: number
  pullWindow: number
}

type WsEvent =
  | PullResultEvent
  | PullBatchResultEvent
  | FeedPullEvent
  | AdminActivityEvent
  | RaidAttackEvent
  | DuelProposedEvent
  | DuelUpdateEvent
  | DuelSettledEvent
  | BetPlacedEvent

export class WsManager {
  readonly #connections = new Map<string, WebSocket>()

  register(userId: string, ws: WebSocket): void {
    this.#connections.set(userId, ws)
    ws.on('close', () => {
      if (this.#connections.get(userId) === ws) {
        this.#connections.delete(userId)
      }
    })
  }

  notify(userId: string, event: WsEvent): void {
    const ws = this.#connections.get(userId)
    if (ws?.readyState === 1 /* OPEN */) {
      try {
        ws.send(JSON.stringify(event))
      } catch {
        // Best-effort push — swallow send errors to avoid failing the HTTP caller
      }
    }
  }

  broadcast(event: FeedPullEvent): void {
    const json = JSON.stringify(event)
    for (const ws of this.#connections.values()) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(json)
        } catch {
          // Best-effort push
        }
      }
    }
  }

  readonly #adminConnections = new Map<string, WebSocket>()

  registerAdmin(userId: string, ws: WebSocket): void {
    this.#adminConnections.set(userId, ws)
    ws.on('close', () => {
      if (this.#adminConnections.get(userId) === ws) {
        this.#adminConnections.delete(userId)
      }
    })
  }

  notifyAdmins(event: AdminActivityEvent): void {
    const json = JSON.stringify(event)
    for (const ws of this.#adminConnections.values()) {
      if (ws.readyState === 1 /* OPEN */) {
        try {
          ws.send(json)
        } catch {
          // Best-effort push
        }
      }
    }
  }

  get size(): number {
    return this.#connections.size
  }
}

// Singleton partagé (process unique — pour multi-instance, utiliser Redis pub/sub)
export const wsManager = new WsManager()
