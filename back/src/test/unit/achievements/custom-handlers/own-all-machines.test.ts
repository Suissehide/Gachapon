import { describe, expect, it, jest } from '@jest/globals'
import { ownAllMachinesHandler } from '../../../../main/domain/achievements/custom-handlers/own-all-machines'

const event = { kind: 'MACHINE_PURCHASED' as const, machineId: 'm1' }

describe('ownAllMachinesHandler', () => {
  it('unlocked si nombre possédé = nombre total', async () => {
    const tx = {
      shopItem: { count: jest.fn().mockResolvedValue(3) },
      purchase: { count: jest.fn().mockResolvedValue(3) },
    } as any
    const result = await ownAllMachinesHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(true)
  })

  it('non unlocked si une machine manque', async () => {
    const tx = {
      shopItem: { count: jest.fn().mockResolvedValue(3) },
      purchase: { count: jest.fn().mockResolvedValue(2) },
    } as any
    const result = await ownAllMachinesHandler.evaluate(tx, 'u1', event)
    expect(result.unlocked).toBe(false)
  })
})
