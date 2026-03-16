import type { WebSocket } from '@fastify/websocket'

type WsEvent = {
  type: 'pull:result'
  card: {
    id: string
    name: string
    imageUrl: string
    rarity: string
    variant: string | null
    set: { id: string; name: string }
  }
  wasDuplicate: boolean
  dustEarned: number
  tokensRemaining: number
  pityCurrent: number
}

class WsManager {
  readonly #connections = new Map<string, WebSocket>()

  register(userId: string, ws: WebSocket): void {
    this.#connections.set(userId, ws)
    ws.on('close', () => this.#connections.delete(userId))
  }

  notify(userId: string, event: WsEvent): void {
    const ws = this.#connections.get(userId)
    if (ws?.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(event))
    }
  }

  get size(): number {
    return this.#connections.size
  }
}

// Singleton partagé (process unique — pour multi-instance, utiliser Redis pub/sub)
export const wsManager = new WsManager()
