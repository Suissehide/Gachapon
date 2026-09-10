// PerksPanel — les quatre bonus d'équipe, en rangées, dans le rail gauche de
// la fiche d'équipe. Reprend `docs/design_handoff_equipe/equipe.css`
// (`.tmB-perkrow`, `.tm-perk-ico`, `.tm-pips`, `.tm-perk-lock`) et la
// composition de `PerkRows` dans `equipe-parts.jsx` : grille 32px/1fr,
// gap 11px, padding 13/14, radius 15px, cinq pastilles en pied de rangée.
//
// VERROUILLAGE — la maquette teste `lvl === 0`, ce qui confondrait deux états
// bien distincts servis par le serveur : un bonus DÉBLOQUÉ mais pas encore
// investi (rang 0, lisible, pastilles vides) et un bonus encore VERROUILLÉ
// par le niveau d'équipe (grisé, pointillés, badge « NIV. X »). On lit donc
// `perk.unlocked`, calculé côté back à partir de `teamPerk.<clé>.unlockLevel`,
// jamais le rang.
import { Coins, Hammer, Lock, Star, Swords } from 'lucide-react'
import type { ComponentType, CSSProperties } from 'react'

import type {
  TeamPerkKey,
  TeamPerkState,
} from '../../api/teamProgression.api.ts'
import { cn, plural } from '../../libs/utils.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { PerkInvestPopup } from './PerkInvestPopup.tsx'

type PerkMeta = {
  name: string
  /** Teinte de la rangée (icône + pastilles), injectée en `--pc`. */
  color: string
  Icon: ComponentType<{ className?: string }>
}

// Noms et teintes repris du handoff (`equipe-data.jsx`, `PERKS`). Les quatre
// couleurs sont tokenisées dans `styles/_colors.css` (`--perk-*`) plutôt
// qu'écrites en hex ici.
export const PERK_META: Record<TeamPerkKey, PerkMeta> = {
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
        ? `+${value} attaque${plural(perk.effect)} de raid par membre et par semaine`
        : 'Une attaque de raid de plus par membre tous les deux rangs'
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

export function PerkRow({
  perk,
  maxRank,
}: {
  perk: TeamPerkState
  maxRank: number
}) {
  const meta = PERK_META[perk.key]
  const locked = !perk.unlocked
  const { Icon } = meta

  return (
    <div
      className={cn(
        'grid grid-cols-[32px_1fr] items-start gap-[11px] rounded-[15px] border-[1.5px] px-3.5 py-[13px]',
        locked
          ? 'border-dashed border-foreground/14 bg-muted'
          : 'border-foreground/7 bg-card',
      )}
      style={{ '--pc': meta.color } as CSSProperties}
    >
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-[11px]',
          locked
            ? 'bg-foreground/12 text-foreground/45'
            : 'bg-[var(--pc)] text-white shadow-[0_6px_14px_-6px_var(--pc)]',
        )}
      >
        {locked ? (
          <Lock className="h-[15px] w-[15px]" />
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'truncate font-display text-sm font-extrabold',
              locked ? 'text-foreground/42' : 'text-text',
            )}
          >
            {meta.name}
          </span>
          {locked ? (
            // Badge `.tm-perk-lock` : le niveau qui déverrouille le bonus,
            // pas le niveau actuel de l'équipe.
            <span className="ml-auto shrink-0 rounded-full border border-primary/40 bg-primary/10 px-[7px] py-[3px] font-mono text-[9px] tracking-[0.12em] text-primary-dark">
              NIV. {perk.unlockLevel}
            </span>
          ) : (
            <span className="ml-auto shrink-0 font-mono text-[10px] text-foreground/50">
              {perk.rank}/{maxRank}
            </span>
          )}
        </div>

        <p
          className={cn(
            'mt-1 text-[11.5px] leading-[1.45] [text-wrap:pretty]',
            locked ? 'text-foreground/42' : 'text-foreground/60',
          )}
        >
          {perkDescription(perk)}
        </p>

        <div className="mt-2 flex gap-1">
          {Array.from({ length: maxRank }, (_, i) => (
            <i
              // biome-ignore lint/suspicious/noArrayIndexKey: pastilles décoratives, compte fixe (maxRank), jamais réordonnées
              key={`${perk.key}-pip-${i}`}
              className={cn(
                'h-[5px] flex-1 rounded-[3px]',
                !locked && i < perk.rank
                  ? 'bg-[var(--pc)]'
                  : 'bg-foreground/10',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

type PerksPanelProps = {
  teamId: string
  perks: TeamPerkState[]
  maxRank: number
  perkPoints: number
  /** Chef ou officier : les seuls rôles autorisés à dépenser un point. */
  canManage: boolean
}

export function PerksPanel({
  teamId,
  perks,
  maxRank,
  perkPoints,
  canManage,
}: PerksPanelProps) {
  return (
    <ArcadeCard>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-foreground/50">
          Bonus d'équipe
        </h2>
        {perkPoints > 0 && (
          <span className="shrink-0 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] text-primary-dark">
            {perkPoints} POINT{plural(perkPoints).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        {perks.map((perk) => (
          <PerkRow key={perk.key} perk={perk} maxRank={maxRank} />
        ))}
      </div>

      {canManage ? (
        // Le popup reste monté même à zéro point : il n'affiche alors plus de
        // bouton, seulement la note ci-dessous. Le démonter dès que le
        // dernier point est dépensé fermerait la modale sous les doigts du
        // joueur au moment même où elle doit lui montrer le résultat.
        <PerkInvestPopup
          teamId={teamId}
          perks={perks}
          maxRank={maxRank}
          perkPoints={perkPoints}
        />
      ) : (
        <p className="mt-3 text-center font-mono text-[10px] leading-[1.5] tracking-[0.06em] text-foreground/45">
          Seuls le chef et les officiers investissent les points de bonus.
        </p>
      )}
    </ArcadeCard>
  )
}
