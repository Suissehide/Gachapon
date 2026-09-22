// Métadonnées d'affichage des quatre bonus d'équipe : nom, teinte, icône, et
// la phrase qui décrit l'effet au rang courant. Le serveur ne renvoie que des
// données (`key`, `rank`, `effect`, `unlockLevel`, `unlocked`) — tout ce qui
// est lisible par un humain vit ici.
//
// MODULE À PART, ET C'EST LE POINT : `PerksPanel` rend les rangées,
// `PerkInvestPopup` rend les mêmes bonus dans sa modale, et le panneau monte
// le popup. Faire vivre ces constantes dans le panneau créait un cycle
// panneau → popup → panneau qui ne tenait que parce que les deux côtés
// déréférencaient l'autre à l'intérieur d'un corps de composant. Une seule
// constante hissée au niveau module dans l'un des deux fichiers, et l'import
// plantait — sans le moindre avertissement d'ici là. Ce ne sont pas les
// internes du panneau, ce sont des données partagées : elles ont leur module.
import { Coins, Hammer, Star, Swords } from 'lucide-react'
import type { ComponentType } from 'react'

import type { TeamPerkKey, TeamPerkState } from '../api/teamProgression.api.ts'
import { currentLocale } from '../i18n/index.ts'
import { formatNumber, plural } from '../libs/utils.ts'

export type TeamPerkMeta = {
  name: string
  /** Teinte de la rangée (icône + pastilles), injectée en `--pc`. */
  color: string
  Icon: ComponentType<{ className?: string }>
}

// Teintes reprises du handoff (`equipe-data.jsx`, `PERKS`), tokenisées dans
// `styles/_colors.css` (`--perk-*`) plutôt qu'écrites en hex ici.
//
// ATTENTION à la clé `loot` : elle vient du handoff, où le bonus s'appelait
// « Butin partagé », et elle est figée en base (`TeamPerk.key`) comme en
// config (`teamPerk.loot.*`). Elle ne décrit PAS l'effet, qui est une
// accélération de la régénération de jetons — d'où le nom affiché, qui lui
// dit vrai. Renommer la clé demanderait une migration de données pour un
// gain nul côté joueur : c'est le libellé qui compte, et il est ici.
export const PERK_META: Record<TeamPerkKey, TeamPerkMeta> = {
  loot: { name: 'Flux de jetons', color: 'var(--perk-loot)', Icon: Coins },
  raid: { name: 'Cadence de raid', color: 'var(--perk-raid)', Icon: Swords },
  xp: { name: "Bannière d'XP", color: 'var(--perk-xp)', Icon: Star },
  forge: { name: 'Forge commune', color: 'var(--perk-forge)', Icon: Hammer },
}

// `currentLocale()` lu ici, au moment du formatage — pas mémorisé au niveau
// module — car cette constante est importée par deux composants distincts
// (`PerksPanel`, `PerkInvestPopup`) qui n'ont pas de variable `locale` en
// commun à leur faire traverser.
const formatEffect = (n: number) =>
  formatNumber(n, currentLocale(), { maximumFractionDigits: 1 })

/**
 * Description d'un bonus, à son rang courant.
 *
 * Les libellés de la maquette (« +5 % de jetons sur chaque tirage ») ne
 * décrivent PAS ce que le serveur applique : `loot` accélère la
 * régénération de jetons (`effectiveRegenInterval`, economy.domain.ts), il
 * n'ajoute rien au butin d'un tirage. Les quatre phrases ci-dessous sont
 * écrites depuis les sites d'application réels, pas depuis la maquette.
 *
 * `raid` est le seul effet entier (`Math.floor(rang × 0,5)`) : au rang 1 il
 * vaut encore 0, et afficher « +0 attaque » se lirait comme un bug. Ce cas
 * bascule sur la phrase générique, qui dit la règle plutôt que le total.
 *
 * Son unité est le JOUR, pas la semaine : le serveur ajoute le bonus à
 * `raid.attacksPerDay` (`raid.domain.ts`, via `raidAttacksBonusForTeam`),
 * qui borne un quota QUOTIDIEN. Le rang 5 vaut donc deux attaques par jour
 * et par membre — quatorze sur la semaine, pas deux. Écrire « par semaine »
 * ici faisait décliner un rang sept fois plus fort qu'annoncé.
 */
/**
 * L'effet d'un bonus en CHIFFRE, avec son unité et rien d'autre : « +2,5 % »,
 * « +1 attaque ». Sert là où la phrase complète serait de trop — la valeur
 * courante sur le panneau, que tous les membres lisent, et le « avant →
 * après » de la modale d'investissement.
 *
 * Prend l'effet brut et non un `TeamPerkState`, précisément pour pouvoir
 * chiffrer un rang qui n'existe pas encore : celui qu'on s'apprête à acheter.
 *
 * `raid` est le seul entier, et le seul à valoir zéro sur un rang investi
 * (son effet monte tous les DEUX rangs) : un « +0 attaque » se lirait comme
 * un bug, d'où le tiret.
 */
export function perkValue(key: TeamPerkKey, effect: number): string {
  if (key === 'raid') {
    return effect > 0 ? `+${effect} attaque${plural(effect)}` : '—'
  }
  const value = formatEffect(effect)
  return key === 'forge' ? `−${value} %` : `+${value} %`
}

/**
 * L'effet qu'aurait ce bonus à `rank`, sans interroger le serveur.
 *
 * Reproduit `perkEffect` (back/domain/team-progression/team-progression-rules)
 * — rang × effet par rang, plancher entier pour `raid`, borné au plafond. La
 * duplication est assumée et minimale : afficher « après » exigerait sinon un
 * aller-retour réseau par rangée, pour une multiplication.
 *
 * Le `perRank` ne se devine pas côté client : il vient de `/economy/config`,
 * et l'appelant le lui passe. Le coder en dur ici ferait mentir l'écran au
 * premier ajustement d'équilibrage.
 */
export function perkEffectAt(
  key: TeamPerkKey,
  rank: number,
  perRank: number,
  maxRank: number,
): number {
  const raw = Math.max(0, Math.min(rank, maxRank)) * perRank
  return key === 'raid' ? Math.floor(raw) : raw
}

export function perkDescription(perk: TeamPerkState): string {
  const value = formatEffect(perk.effect)
  switch (perk.key) {
    case 'loot':
      return perk.rank > 0
        ? `Régénération de jetons +${value} % pour chaque membre`
        : 'Accélère la régénération de jetons de chaque membre'
    case 'raid':
      return perk.effect > 0
        ? `+${value} attaque${plural(perk.effect)} de raid par membre et par jour`
        : 'Une attaque de raid de plus par jour et par membre, tous les deux rangs'
    case 'xp':
      return perk.rank > 0
        ? `+${value} % d'XP de campagne pour chaque membre`
        : "Augmente l'XP de campagne de chaque membre"
    case 'forge':
      return perk.rank > 0
        ? `Coût d'amélioration d'équipement −${value} %`
        : "Réduit le coût d'amélioration d'équipement"
  }
}
