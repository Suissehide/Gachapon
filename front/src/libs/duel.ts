import type { DuelView } from '../api/wagers.api.ts'
import { plural } from './utils.ts'

/**
 * Les deux camps d'un duel vus depuis MOI. `myRole` est la seule source :
 * aucune comparaison d'identifiant n'est nécessaire, et un spectateur — pour
 * qui « moi » n'a pas de sens — ne doit pas passer par ici.
 *
 * Appelée par le bandeau de la page de tirage et par la fenêtre de résultat,
 * qui dérivaient la même chose ligne pour ligne.
 */
export function duelSides(duel: DuelView) {
  const iAmChallenger = duel.myRole === 'CHALLENGER'
  return {
    me: iAmChallenger ? duel.challenger : duel.opponent,
    them: iAmChallenger ? duel.opponent : duel.challenger,
    myScore: iAmChallenger ? duel.challengerScore : duel.opponentScore,
    theirScore: iAmChallenger ? duel.opponentScore : duel.challengerScore,
    myPulls: iAmChallenger ? duel.challengerPulls : duel.opponentPulls,
    theirPulls: iAmChallenger ? duel.opponentPulls : duel.challengerPulls,
  }
}

/**
 * Identifiants des joueurs déjà engagés dans un duel non tranché de
 * l'équipe (PENDING ou ACTIVE). Le serveur refuserait de toute façon la
 * proposition (« X a déjà un duel en cours »), mais un adversaire qu'on ne
 * peut pas choisir vaut mieux qu'une erreur après coup.
 *
 * Attention : un coéquipier engagé dans une AUTRE de ses équipes n'apparaît
 * pas ici — la vue ne connaît que les duels de cette équipe — et c'est alors
 * l'erreur du serveur, remontée en toast, qui tranche.
 */
export function busyUserIds(duels: DuelView[]): Set<string> {
  const busy = new Set<string>()
  for (const duel of duels) {
    if (duel.status === 'PENDING' || duel.status === 'ACTIVE') {
      busy.add(duel.challenger.id)
      busy.add(duel.opponent.id)
    }
  }
  return busy
}

/**
 * Ai-je moi-même un duel non tranché dans cette équipe ? Déduit du rôle et
 * non d'une comparaison avec l'identifiant du store d'authentification :
 * un store momentanément vide rendrait la comparaison fausse pour tout le
 * monde, donc le bouton « Défier » actif alors qu'il doit être bloqué.
 */
export function hasOpenDuel(duels: DuelView[]): boolean {
  return duels.some(
    (duel) =>
      duel.myRole !== 'SPECTATOR' &&
      (duel.status === 'PENDING' || duel.status === 'ACTIVE'),
  )
}

/**
 * Tirages restants sur une fenêtre `done`/`total` — partagé par les duels
 * (tirages comptés sur `pullCount`) et les paris (tirages vus sur
 * `pullWindow`) : les deux sont le même calcul « fait / à faire », déplacé
 * ici depuis `WagersPanel` pour que `WagerBanner` puisse aussi l'utiliser
 * pour les paris posés sur le joueur.
 */
export function pullsLeft(done: number, total: number): number {
  return Math.max(0, total - done)
}

export function pullsLeftLabel(done: number, total: number): string {
  const left = pullsLeft(done, total)
  return `${left} tirage${plural(left)} restant${plural(left)}`
}

/**
 * Cote d'un pari, formatée en français à 2 décimales (`×2,35`, `1,00`).
 * Partagée par `WagersPanel` (ligne de pari active) et `BetPlacePopup`
 * (devis en direct) — même formule, ne pas la recopier une troisième fois.
 */
export function fmtMultiplier(multiplier: number): string {
  return multiplier.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
