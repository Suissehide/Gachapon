import type { PullBatchEntry } from '../constants/gacha.constant.ts'
import type { FeedEntry } from '../types/feed'

type WsEvent =
  | { type: 'connected'; userId: string }
  | {
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
  | {
      type: 'pull:batch-result'
      pulls: PullBatchEntry[]
      tokensRemaining: number
      xpGained: number
    }
  | ({ type: 'feed:pull' } & FeedEntry)
  | {
      type: 'raid:attack'
      teamId: string
      raidId: string
      hp: number
      maxHp: number
      attacker: { id: string; username: string }
      damage: number
      killed: boolean
    }
  | {
      type: 'duel:proposed'
      teamId: string
      duelId: string
      challenger: { id: string; username: string }
    }
  | {
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
  | {
      type: 'duel:settled'
      teamId: string
      duelId: string
      winnerId: string | null
      transferredCount: number
    }
  | { type: 'error'; message: string }
  | {
      type: 'admin:activity'
      event: {
        id: string
        type: string
        payload: Record<string, unknown> | null
        createdAt: string
        user: { id: string; username: string } | null
      }
    }

type WsEventListener = (event: WsEvent) => void

class WsClient {
  #ws: WebSocket | null = null
  #listeners = new Set<WsEventListener>()
  #intentionalClose = false

  connect(baseUrl: string) {
    if (this.#ws?.readyState === WebSocket.OPEN) {
      return
    }
    this.#intentionalClose = false

    const url = `${baseUrl.replace(/^http/, 'ws')}/ws`
    this.#ws = new WebSocket(url)

    this.#ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as WsEvent
        for (const listener of this.#listeners) {
          listener(event)
        }
      } catch {
        // ignore malformed
      }
    }

    this.#ws.onclose = () => {
      if (!this.#intentionalClose) {
        setTimeout(() => this.connect(baseUrl), 3000)
      }
    }
  }

  disconnect() {
    this.#intentionalClose = true
    this.#ws?.close()
    this.#ws = null
  }

  on(listener: WsEventListener): () => void {
    this.#listeners.add(listener)
    return () => this.#listeners.delete(listener)
  }
}

export const wsClient = new WsClient()
export type { WsEvent }
