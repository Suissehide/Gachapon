import { describe, expect, it, jest } from '@jest/globals'

import {
  isPrismaSerializationError,
  retryOnSerialization,
} from '../../main/domain/shared/retry-serialization'

// Forme remontee par @prisma/adapter-pg sous Prisma 7 : aucun `code`, un
// nom de classe et une cause qui portent le conflit. C'est celle qu'on
// observe reellement quand deux transactions Serializable se croisent (deux
// propositions de duel simultanees, par exemple).
function driverAdapterConflict(): Error {
  const err = new Error('TransactionWriteConflict')
  err.name = 'DriverAdapterError'
  ;(err as unknown as { cause: { kind: string } }).cause = {
    kind: 'TransactionWriteConflict',
  }
  return err
}

describe('retry-serialization — reconnaissance du conflit', () => {
  it('reconnait la forme historique P2034', () => {
    expect(isPrismaSerializationError({ code: 'P2034' })).toBe(true)
  })

  it('reconnait le DriverAdapterError de Prisma 7 (aucun code)', () => {
    const err = driverAdapterConflict()
    expect((err as unknown as { code?: string }).code).toBeUndefined()
    expect(isPrismaSerializationError(err)).toBe(true)
  })

  it('reconnait la cause seule, sans nom de classe', () => {
    expect(
      isPrismaSerializationError({
        cause: { kind: 'TransactionWriteConflict' },
      }),
    ).toBe(true)
  })

  it("ne confond pas une autre erreur Prisma avec un conflit", () => {
    expect(isPrismaSerializationError({ code: 'P2002' })).toBe(false)
    expect(isPrismaSerializationError(new Error('boom'))).toBe(false)
    expect(isPrismaSerializationError(null)).toBe(false)
    expect(isPrismaSerializationError('P2034')).toBe(false)
  })
})

describe('retry-serialization — rejeu', () => {
  it('rejoue un conflit de pilote puis rend le resultat', async () => {
    const thunk = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(driverAdapterConflict())
      .mockResolvedValueOnce('ok')
    await expect(retryOnSerialization(thunk)).resolves.toBe('ok')
    expect(thunk).toHaveBeenCalledTimes(2)
  })

  it('ne rejoue pas une erreur metier', async () => {
    const boom = new Error('Tu as deja un duel en cours')
    const thunk = jest.fn<() => Promise<string>>().mockRejectedValue(boom)
    await expect(retryOnSerialization(thunk)).rejects.toBe(boom)
    expect(thunk).toHaveBeenCalledTimes(1)
  })

  it('relance l\'erreur d\'origine une fois les rejeux epuises', async () => {
    const conflict = driverAdapterConflict()
    const thunk = jest.fn<() => Promise<string>>().mockRejectedValue(conflict)
    await expect(retryOnSerialization(thunk, 2)).rejects.toBe(conflict)
    expect(thunk).toHaveBeenCalledTimes(3)
  })
})
