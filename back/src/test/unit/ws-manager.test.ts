import { describe, expect, it, jest } from '@jest/globals'
import { WsManager } from '../../main/interfaces/ws/ws-manager'
import type { FeedPullEvent } from '../../main/interfaces/ws/ws-manager'

function mockWs(sent: string[]) {
  return {
    readyState: 1 as const,
    send: (data: string) => { sent.push(data) },
    on: jest.fn(),
  }
}

const FEED_EVENT: FeedPullEvent = {
  type: 'feed:pull',
  username: 'Alice',
  cardName: 'Mion',
  rarity: 'LEGENDARY',
  variant: 'NORMAL',
  cardId: 'card-1',
  imageUrl: null,
  setName: 'Set A',
  pulledAt: '2026-01-01T00:00:00.000Z',
}

describe('WsManager.broadcast', () => {
  it('envoie l\'event à tous les clients OPEN', () => {
    const manager = new WsManager()
    const sent1: string[] = []
    const sent2: string[] = []
    manager.register('u1', mockWs(sent1) as any)
    manager.register('u2', mockWs(sent2) as any)

    manager.broadcast(FEED_EVENT)

    expect(sent1).toHaveLength(1)
    expect(sent2).toHaveLength(1)
    expect(JSON.parse(sent1[0]!)).toMatchObject({ type: 'feed:pull', username: 'Alice' })
  })

  it('ignore les connexions avec readyState !== 1', () => {
    const manager = new WsManager()
    const sent: string[] = []
    const closedWs = { readyState: 3, send: (d: string) => sent.push(d), on: jest.fn() }
    manager.register('u1', closedWs as any)

    manager.broadcast(FEED_EVENT)

    expect(sent).toHaveLength(0)
  })

  it('ne plante pas si une connexion lève une erreur lors du send', () => {
    const manager = new WsManager()
    const errorWs = {
      readyState: 1,
      send: () => { throw new Error('connection reset') },
      on: jest.fn(),
    }
    manager.register('u1', errorWs as any)

    expect(() => manager.broadcast(FEED_EVENT)).not.toThrow()
  })
})
