import { describe, expect, it, jest } from '@jest/globals'

import {
  isPrismaSerializationError,
  retryOnSerialization,
  serializationBackoffMs,
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

describe('retry-serialization — attente entre deux tentatives', () => {
  it('croit avec la tentative et reste plafonnee', () => {
    // Tirage au minimum (moitie fixe seule) : la borne basse de chaque
    // palier, soit la moitie des plafonds 15 -> 30 -> 60 -> 120.
    const low = (attempt: number) => serializationBackoffMs(attempt, () => 0)
    expect(low(0)).toBe(8)
    expect(low(1)).toBe(15)
    expect(low(2)).toBe(30)
    expect(low(3)).toBe(60)
    // Plafond : la 10e tentative n'attend pas plus que la 4e.
    expect(low(10)).toBe(60)
    // Tirage au maximum : jamais au-dela du plafond, quelle que soit la
    // tentative.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      expect(serializationBackoffMs(attempt, () => 0.999999)).toBeLessThanOrEqual(120)
    }
  })

  it('jitter : deux concurrents ne repartent pas au meme instant', () => {
    // C'est LE point de la correction : sans part aleatoire, deux rejeux
    // declenches par le meme conflit se recroisent a l'identique.
    expect(serializationBackoffMs(2, () => 0)).not.toBe(
      serializationBackoffMs(2, () => 1),
    )
  })

  it('attend reellement avant de rejouer', async () => {
    const thunk = jest
      .fn<() => Promise<string>>()
      .mockRejectedValueOnce(driverAdapterConflict())
      .mockResolvedValueOnce('ok')
    const started = Date.now()
    await expect(retryOnSerialization(thunk)).resolves.toBe('ok')
    // Borne basse de la premiere attente (moitie fixe de 15 ms), moins une
    // marge pour la granularite des timers.
    expect(Date.now() - started).toBeGreaterThanOrEqual(6)
  })
})
