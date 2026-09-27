import type { Locale } from '../../infra/i18n/locale'

/**
 * Pseudos des comptes invités : créature du folklore japonais + adjectif +
 * chiffres. ASCII seul, sans accent — un pseudo généré doit pouvoir se taper
 * tel quel (invitation par pseudo, recherche), comme ceux que l'OAuth
 * assainit en `[a-zA-Z0-9_]`.
 */
export const GUEST_CREATURES = [
  'Tanuki',
  'Kitsune',
  'Daruma',
  'Kappa',
  'Neko',
  'Tengu',
  'Baku',
  'Kodama',
  'Maneki',
  'Karasu',
  'Tsuru',
  'Koi',
  'Usagi',
  'Tora',
  'Oni',
  'Yokai',
] as const

// Adjectifs sans accent, accordés au masculin comme les créatures.
export const GUEST_ADJECTIVES_FR = [
  'Chanceux',
  'Malin',
  'Joyeux',
  'Brave',
  'Discret',
  'Agile',
  'Rieur',
  'Curieux',
  'Hardi',
  'Vif',
  'Sage',
  'Farceur',
  'Taquin',
  'Rapide',
  'Fougueux',
  'Songeur',
] as const

export const GUEST_ADJECTIVES_EN = [
  'Lucky',
  'Sly',
  'Bold',
  'Swift',
  'Clever',
  'Jolly',
  'Brave',
  'Quiet',
  'Nimble',
  'Merry',
  'Curious',
  'Daring',
  'Keen',
  'Wise',
  'Sneaky',
  'Dreamy',
] as const

const pick = <T>(list: readonly T[], random: () => number): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))] as T

export function generateGuestUsername(
  locale: Locale,
  digits: 2 | 4,
  random: () => number = Math.random,
): string {
  const creature = pick(GUEST_CREATURES, random)
  const adjective =
    locale === 'FR'
      ? pick(GUEST_ADJECTIVES_FR, random)
      : pick(GUEST_ADJECTIVES_EN, random)
  const max = 10 ** digits
  const n = Math.min(max - 1, Math.floor(random() * max))
  const suffix = String(n).padStart(digits, '0')
  return locale === 'FR'
    ? `${creature}${adjective}${suffix}`
    : `${adjective}${creature}${suffix}`
}
