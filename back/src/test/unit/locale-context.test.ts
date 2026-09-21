import { describe, expect, it } from '@jest/globals'

import {
  enterLocale,
  getCurrentLocale,
  runWithLocale,
} from '../../main/infra/i18n/locale-context'

describe('contexte de locale', () => {
  it('renvoie la locale par défaut hors de tout contexte', () => {
    expect(getCurrentLocale()).toBe('EN')
  })

  it('expose la locale ouverte par runWithLocale', () => {
    expect(runWithLocale('FR', () => getCurrentLocale())).toBe('FR')
  })

  it('survit à une frontière asynchrone', async () => {
    const read = await runWithLocale('FR', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
      return getCurrentLocale()
    })
    expect(read).toBe('FR')
  })

  it('enterLocale s\'applique à la suite du contexte courant', async () => {
    const read = await runWithLocale('EN', async () => {
      enterLocale('FR')
      await new Promise((resolve) => setTimeout(resolve, 5))
      return getCurrentLocale()
    })
    expect(read).toBe('FR')
  })

  it('isole deux contextes concurrents', async () => {
    const [a, b] = await Promise.all([
      runWithLocale('FR', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return getCurrentLocale()
      }),
      runWithLocale('EN', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        return getCurrentLocale()
      }),
    ])
    expect(a).toBe('FR')
    expect(b).toBe('EN')
  })
})
