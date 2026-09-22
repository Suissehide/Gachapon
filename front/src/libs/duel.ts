import type { DuelView } from '../api/wagers.api.ts'
import i18n, { currentLocale } from '../i18n/index.ts'
import { formatNumber } from './utils.ts'

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
  // Pluriel délégué à i18next (`_one`/`_other`, résolus par Intl.PluralRules) :
  // la règle française n'est pas celle de l'anglais sur 0 — « 0 tirage restant »
  // au singulier, « 0 pulls left » au pluriel. Voir la note sur les pluriels
  // dans `i18n/index.ts`.
  return i18n.t('wagers:pullsLeft', { count: pullsLeft(done, total) })
}

/**
 * Cote d'un pari, à 2 décimales selon la locale courante (`×2,35` en
 * français, `×2.35` en anglais). Partagée par `WagersPanel` (ligne de pari
 * active) et `BetPlacePopup` (devis en direct) — même formule, ne pas la
 * recopier une troisième fois. Locale lue ici, à l'appel, plutôt que reçue
 * en paramètre : les deux appelants n'ont rien d'autre en commun.
 */
export function fmtMultiplier(multiplier: number): string {
  return formatNumber(multiplier, currentLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
