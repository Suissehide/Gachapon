import type { WebSocket } from '@fastify/websocket'

type PullResultEvent = {
  type: 'pull:result'
  card: {
    id: string
    name: string
    imageUrl: string | null
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
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

type WsEvent = PullResultEvent | FeedPullEvent

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

  get size(): number {
    return this.#connections.size
  }
}

// Singleton partagé (process unique — pour multi-instance, utiliser Redis pub/sub)
export const wsManager = new WsManager()
