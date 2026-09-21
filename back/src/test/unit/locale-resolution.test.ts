import { describe, expect, it } from '@jest/globals'

import {
  DEFAULT_LOCALE,
  parseLocale,
  resolveLocaleFromHeader,
} from '../../main/infra/i18n/locale'

describe('négociation de la langue', () => {
  it('sert l\'anglais par défaut', () => {
    expect(DEFAULT_LOCALE).toBe('EN')
    expect(resolveLocaleFromHeader(undefined)).toBe('EN')
    expect(resolveLocaleFromHeader('')).toBe('EN')
  })

  it('reconnaît une variante régionale du français', () => {
    expect(resolveLocaleFromHeader('fr-CA')).toBe('FR')
    expect(resolveLocaleFromHeader('fr')).toBe('FR')
  })

  it('respecte les poids et retient le mieux noté', () => {
    expect(resolveLocaleFromHeader('en;q=0.3, fr;q=0.9')).toBe('FR')
    expect(resolveLocaleFromHeader('fr;q=0.2, en;q=0.8')).toBe('EN')
  })

  it('ignore les langues non gérées', () => {
    expect(resolveLocaleFromHeader('de-DE, ja;q=0.8')).toBe('EN')
    expect(resolveLocaleFromHeader('de, fr;q=0.1')).toBe('FR')
  })

  it('ne se laisse pas casser par un en-tête mal formé', () => {
    expect(resolveLocaleFromHeader(';;;q=')).toBe('EN')
    expect(resolveLocaleFromHeader('fr;q=abc')).toBe('FR')
  })

  it('parseLocale n\'accepte que les locales gérées', () => {
    expect(parseLocale('fr')).toBe('FR')
    expect(parseLocale('EN')).toBe('EN')
    expect(parseLocale('de')).toBeNull()
    expect(parseLocale(undefined)).toBeNull()
  })

  // Deuxième ligne de défense : la signature déclare `string | undefined`,
  // mais les types s'effacent à l'exécution. Un paramètre de querystring
  // répété (`?lang=fr&lang=en`) arrive côté Fastify comme un tableau — le
  // hook `onRequest` de `locale.plugin.ts` filtre déjà ce cas avant
  // d'appeler `parseLocale`, mais cette fonction est exportée et pourrait
  // être appelée ailleurs sans cette garde. Elle ne doit jamais lever, quel
  // que soit ce qu'on lui passe.
  it('ne lève pas sur une entrée non-string — traitée comme absente', () => {
    // biome-ignore lint/suspicious/noExplicitAny: simule un appelant qui ne passe pas par le typage TS
    expect(parseLocale(['fr', 'en'] as unknown as string)).toBeNull()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    expect(parseLocale(42 as unknown as string)).toBeNull()
    // biome-ignore lint/suspicious/noExplicitAny: idem
    expect(parseLocale(null as unknown as string)).toBeNull()
  })
})
