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
  | { type: 'error'; message: string }

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
