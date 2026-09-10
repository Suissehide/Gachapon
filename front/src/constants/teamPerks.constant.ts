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
import { plural } from '../libs/utils.ts'

export type TeamPerkMeta = {
  name: string
  /** Teinte de la rangée (icône + pastilles), injectée en `--pc`. */
  color: string
  Icon: ComponentType<{ className?: string }>
}

// Noms et teintes repris du handoff (`equipe-data.jsx`, `PERKS`). Les quatre
// couleurs sont tokenisées dans `styles/_colors.css` (`--perk-*`) plutôt
// qu'écrites en hex ici.
export const PERK_META: Record<TeamPerkKey, TeamPerkMeta> = {
  loot: { name: 'Butin partagé', color: 'var(--perk-loot)', Icon: Coins },
  raid: { name: 'Cadence de raid', color: 'var(--perk-raid)', Icon: Swords },
  xp: { name: "Bannière d'XP", color: 'var(--perk-xp)', Icon: Star },
  forge: { name: 'Forge commune', color: 'var(--perk-forge)', Icon: Hammer },
}

const formatEffect = (n: number) =>
  n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })

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
