/**
 * Courbe d'XP exponentielle : passer du niveau n au niveau n+1 coûte
 * `base·n^exp` XP. Contrairement à la courbe joueur (`shared/xp.ts`, arithmétique),
 * celle-ci croît plus vite en fin de progression — une équipe monte moins souvent
 * mais chaque niveau doit rester un événement.
 */

export type TeamPerkKey = 'loot' | 'raid' | 'xp' | 'forge'

export const TEAM_PERK_KEYS: readonly TeamPerkKey[] = ['loot', 'raid', 'xp', 'forge']

/** XP nécessaire pour passer DU niveau donné au suivant. */
export function xpForTeamLevel(level: number, base: number, exp: number): number {
  return Math.round(base * level ** exp)
}

export type TeamXpState = { level: number; xp: number }

/**
 * Applique un gain d'XP et fait monter autant de niveaux que nécessaire.
 * Un seul gain peut franchir plusieurs seuils : chacun crédite un point de bonus.
 * Au niveau maximum l'XP se fige à 0 — les points hebdomadaires des membres,
 * eux, continuent d'être comptés ailleurs, ils mesurent la contribution.
 */
export function applyTeamXp(
  state: TeamXpState,
  gained: number,
  cfg: { xpBase: number; xpExp: number; maxLevel: number },
): { level: number; xp: number; perkPointsGained: number } {
  let { level, xp } = state
  xp += gained
  let perkPointsGained = 0
  let need = xpForTeamLevel(level, cfg.xpBase, cfg.xpExp)
  while (xp >= need && level < cfg.maxLevel) {
    xp -= need
    level += 1
    perkPointsGained += 1
    need = xpForTeamLevel(level, cfg.xpBase, cfg.xpExp)
  }
  // Seule garde nécessaire, et elle couvre deux cas d'un coup : l'équipe qui
  // vient d'atteindre le plafond dans la boucle, et celle qui y était déjà en
  // entrant — la condition `level < cfg.maxLevel` de la boucle l'empêche alors
  // de tourner, quel que soit le gain. Elle ramène aussi un `state.level`
  // aberrant, supérieur au plafond, à la valeur du plafond.
  if (level >= cfg.maxLevel) {
    return { level: cfg.maxLevel, xp: 0, perkPointsGained }
  }
  return { level, xp, perkPointsGained }
}

/**
 * Effet d'un bonus à un rang donné.
 * `raid` est le seul entier : une attaque tous les deux rangs, d'où le plancher.
 * Les trois autres sont des pourcentages linéaires.
 */
export function perkEffect(key: TeamPerkKey, rank: number, perRank: number): number {
  const raw = rank * perRank
  return key === 'raid' ? Math.floor(raw) : raw
}

export function roleLabel(
  role: 'OWNER' | 'ADMIN' | 'MEMBER',
  joinedAt: Date,
  now: Date,
  recruitDays: number,
): 'Chef' | 'Officier' | 'Membre' | 'Recrue' {
  if (role === 'OWNER') {
    return 'Chef'
  }
  if (role === 'ADMIN') {
    return 'Officier'
  }
  const elapsedDays = (now.getTime() - joinedAt.getTime()) / 86_400_000
  return elapsedDays < recruitDays ? 'Recrue' : 'Membre'
}

/** Teinte stable dérivée du nom, pour les équipes sans `hue` explicite. */
export function hueFromName(name: string): number {
  let h = 0
  for (const ch of name) {
    h = (h * 31 + (ch.codePointAt(0) ?? 0)) % 360
  }
  return h
}
