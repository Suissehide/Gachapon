import { z } from 'zod/v4'

import type { DummySpec } from '../api/combat.api.ts'
import { ELEMENT_ORDER } from './card.constant.ts'

export const MAX_DUMMIES = 3

export const ATTACK_PATTERNS = [
  'BASIC',
  'AOE_3',
  'MULTI_2',
  'MONO_AMPLIFIED',
  'MONO_DOUBLE',
] as const

export const DEFAULT_DUMMY: DummySpec = {
  element: null,
  def: 0,
  atk: 0,
  attackPattern: 'BASIC',
}

/**
 * Réglages des mannequins, portés par l'URL : le combat les relit, et
 * « Réglages » y revient sans rien perdre. Bornes alignées sur le back.
 */
export const dummySearchSchema = z.object({
  dummies: z
    .array(
      z.object({
        element: z.enum(ELEMENT_ORDER).nullable(),
        def: z.number().int().min(0).max(100_000),
        atk: z.number().int().min(0).max(100_000),
        attackPattern: z.enum(ATTACK_PATTERNS),
      }),
    )
    .min(1)
    .max(MAX_DUMMIES)
    .catch([DEFAULT_DUMMY]),
})
