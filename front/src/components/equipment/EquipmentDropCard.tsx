import { Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import type { EquipmentDrop } from '../../api/equipment.api.ts'
import {
  SLOT_ICONS,
  SLOT_LABELS,
} from '../../components/collection/EquipmentSlotsPanel.tsx'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useSalvageItems } from '../../queries/useEquipment.ts'
import { formatBonusKey, statColorVar } from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'

// Rang de rareté, pour la jauge de 5 pastilles de l'en-tête (Commune 1/5 …
// Légendaire 5/5). Le handoff la veut lisible d'un coup d'œil, avant même de
// lire le libellé.
const RARITY_TIER: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
}
const TIER_MAX = 5

// Rareté → trio de variables CSS posées en inline sur la racine. Les jetons
// vivent dans styles/_colors.css ; aucune valeur hexadécimale ici.
const RARITY_VARS: Record<string, Record<string, string>> = {
  COMMON: {
    '--rar': 'var(--rarity-common)',
    '--rar-light': 'var(--rarity-common-light)',
    '--rar-dark': 'var(--rarity-common-dark)',
  },
  UNCOMMON: {
    '--rar': 'var(--rarity-uncommon)',
    '--rar-light': 'var(--rarity-uncommon-light)',
    '--rar-dark': 'var(--rarity-uncommon-dark)',
  },
  RARE: {
    '--rar': 'var(--rarity-rare)',
    '--rar-light': 'var(--rarity-rare-light)',
    '--rar-dark': 'var(--rarity-rare-dark)',
  },
  EPIC: {
    '--rar': 'var(--rarity-epic)',
    '--rar-light': 'var(--rarity-epic-light)',
    '--rar-dark': 'var(--rarity-epic-dark)',
  },
  LEGENDARY: {
    '--rar': 'var(--rarity-legendary)',
    '--rar-light': 'var(--rarity-legendary-light)',
    '--rar-dark': 'var(--rarity-legendary-dark)',
  },
}

/**
 * Valeur affichée d'une stat, arrondie. Un `Pct` s'affiche avec son signe
 * pourcent ; tout le reste est un plat.
 */
function formatValue(key: string, value: number): string {
  const rounded = Math.round(value)
  return key.endsWith('Pct') ? `+${rounded}%` : `+${rounded}`
}

/**
 * Stat principale de la pièce : `bonuses` ne porte qu'une seule clé (le seed
 * le garantit, cf. equipment-seed.test.ts), mise à l'échelle par le niveau
 * puis augmentée de `baseBoost`. Même formule que `accumulateItemBonuses`
 * dans utils/cardStats.ts — d'où le passage de `equipLevelScale` par le
 * parent, qui le tient de la config économique du serveur.
 */
function mainStat(
  drop: EquipmentDrop,
  equipLevelScale: number,
): { key: string; value: number } | null {
  const entries = Object.entries(drop.bonuses)
  const first = entries[0]
  if (!first) {
    return null
  }
  const [key, base] = first
  const mult = 1 + equipLevelScale * (drop.level - 1)
  return { key, value: base * mult + drop.baseBoost }
}

/**
 * Fiche d'une pièce d'équipement obtenue en fin de combat.
 *
 * La pièce est **gardée par défaut** : la seule action est « Détruire ». Il
 * n'y a délibérément pas de bouton « Garder » — ne rien faire suffit.
 */
export function EquipmentDropCard({
  drop,
  scrapGold,
  equipLevelScale,
  onScrap,
  isPending = false,
  className,
  actions,
  trailing,
  highlight,
}: {
  drop: EquipmentDrop
  scrapGold?: number
  equipLevelScale: number
  onScrap?: () => void
  isPending?: boolean
  className?: string
  /**
   * Élément posé en haut à droite de la fiche, au-dessus de la pastille de
   * rareté — l'inventaire y met sa case de sélection.
   */
  trailing?: ReactNode
  /**
   * Remplace le bouton « Détruire ». L'inventaire s'en sert pour ses actions
   * Équiper / Retirer, la fiche restant par ailleurs identique à celle de
   * l'écran de victoire.
   */
  actions?: ReactNode
  /**
   * Écart à mettre en avant sur une sous-stat, juste après une amélioration :
   * l'inventaire y passe le palier renvoyé par le serveur pour que le joueur
   * voie CE QUI a bougé, pas seulement que quelque chose a bougé.
   */
  highlight?: { key: string; delta: number } | null
}) {
  const tier = RARITY_TIER[drop.rarity] ?? 1
  const SlotIcon = SLOT_ICONS[drop.slot]
  const main = mainStat(drop, equipLevelScale)
  const subs = drop.substats.slice(0, 4)

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[18px] border-[1.5px] p-4 pt-4 text-left',
        'border-[color-mix(in_oklab,var(--rar)_42%,transparent)]',
        'bg-[linear-gradient(165deg,color-mix(in_oklab,var(--rar-light)_26%,var(--card)),var(--card)_62%)]',
        'shadow-[0_12px_30px_-20px_color-mix(in_oklab,var(--rar)_70%,transparent)]',
        className,
      )}
      style={RARITY_VARS[drop.rarity] as React.CSSProperties}
    >
      {/* en-tête : icône d'emplacement · titres · (sélection puis) rareté */}
      <div className="flex items-center gap-3">
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(140deg,var(--rar),var(--rar-dark))] text-white shadow-[0_5px_14px_-6px_color-mix(in_oklab,var(--rar)_70%,transparent)]">
          <SlotIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-extrabold leading-[1.1] tracking-[-0.01em] text-text">
            {drop.name}
          </div>
          <div className="mt-[3px] font-mono text-[9.5px] tracking-[0.14em] text-text-light">
            {SLOT_LABELS[drop.slot].toUpperCase()} · NIV. {drop.level}
          </div>
          <div className="mt-[3px] font-mono text-[9px] font-bold tracking-[0.14em] text-[color-mix(in_oklab,var(--rar)_72%,var(--text-light))]">
            {drop.setKey.toUpperCase()}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-[5px]">
          {trailing}
          <span className="rounded-full bg-[var(--rar)] px-2.5 py-1 font-mono text-[9px] font-extrabold tracking-[0.12em] whitespace-nowrap text-white">
            {(RARITY_LABEL_FR[drop.rarity] ?? drop.rarity).toUpperCase()}
          </span>
          <span
            className="inline-flex gap-[3px]"
            title={`Rareté ${tier}/${TIER_MAX}`}
          >
            {Array.from({ length: TIER_MAX }, (_, i) => i + 1).map((i) => (
              <i
                key={i}
                className={cn(
                  'h-[7px] w-[7px] rounded-full',
                  i <= tier
                    ? 'bg-[var(--rar)] shadow-[0_0_5px_color-mix(in_oklab,var(--rar)_60%,transparent)]'
                    : 'bg-text/15',
                )}
              />
            ))}
          </span>
        </div>
      </div>

      {/* stat principale */}
      {main && (
        <div
          className="mt-3 flex items-center gap-2.5 rounded-[13px] border p-3 px-3.5"
          style={
            {
              '--sc': statColorVar(main.key),
              background: 'color-mix(in oklab, var(--sc) 10%, var(--card))',
              borderColor: 'color-mix(in oklab, var(--sc) 30%, transparent)',
            } as React.CSSProperties
          }
        >
          <span className="font-mono text-[11px] font-bold tracking-[0.16em] text-[color-mix(in_oklab,var(--sc)_70%,var(--text))]">
            {formatBonusKey(main.key)}
          </span>
          <span className="ml-auto font-display text-[26px] font-extrabold leading-none tabular-nums text-text">
            {formatValue(main.key, main.value)}
          </span>
        </div>
      )}

      {/* sous-stats : toujours 2 colonnes. À 3 sous-stats, la troisième se
          place seule sur la seconde rangée et garde la largeur d'une colonne
          — elle ne s'étire pas sur toute la fiche. Une rangée de 3 colonnes
          rendait les libellés trop étroits pour rester lisibles. */}
      {subs.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-[7px]">
          {subs.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-1.5 rounded-[11px] border border-border/60 bg-surface-2 px-2.5 py-2.5"
              style={{ '--sc': statColorVar(s.key) } as React.CSSProperties}
            >
              <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--sc)]" />
              {/* Le libellé tient sur UNE ligne : certaines clés sont longues
                  (« % PÉNÉTRATION ARMURE ») et passaient à la ligne, ce qui
                  décalait la hauteur des tuiles voisines. */}
              <span
                className="min-w-0 truncate font-mono text-[9px] whitespace-nowrap tracking-[0.08em] text-text-light"
                title={formatBonusKey(s.key)}
              >
                {formatBonusKey(s.key)}
              </span>
              <span className="ml-auto shrink-0 font-display text-sm font-extrabold tabular-nums text-text">
                {formatValue(s.key, s.value)}
              </span>
              {highlight?.key === s.key && (
                <span className="shrink-0 font-mono text-[10px] font-bold text-emerald-600 tabular-nums">
                  {formatValue(s.key, highlight.delta)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {actions ? (
        // mt-auto : dans une grille où les fiches sont étirées à la même
        // hauteur, les actions se calent en bas quel que soit le nombre de
        // sous-stats au-dessus.
        <div className="mt-auto pt-3.5">{actions}</div>
      ) : (
        // Pas de bouton « Garder » : ne rien faire conserve la pièce.
        <div className="mt-auto flex pt-3.5">
          <Button
            variant="outline"
            onClick={onScrap}
            disabled={isPending}
            className="h-auto flex-1 rounded-[13px] border-[1.5px] border-destructive/25 bg-destructive/10 p-3 text-[15px] text-destructive hover:bg-destructive/15 motion-reduce:transition-none"
          >
            <Trash2 className="h-[15px] w-[15px]" />
            Détruire
            <span className="font-mono text-[11px] whitespace-nowrap opacity-80">
              +{(scrapGold ?? 0).toLocaleString('fr-FR')} or
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}

/** Confirmation compacte qui remplace la fiche une fois la pièce détruite. */
export function EquipmentScrapped({
  gold,
  className,
}: {
  gold: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[14px] border border-emerald-200 bg-emerald-50 p-3.5 text-center font-mono text-xs font-bold tracking-[0.08em] text-emerald-800',
        className,
      )}
    >
      ✓ Détruit · +{gold.toLocaleString('fr-FR')} or
    </div>
  )
}

/**
 * Enveloppe pour l'écran de victoire : lit elle-même le barème de revente et
 * la mutation de destruction, porte l'état « détruite » pour céder la place à
 * la confirmation, et rend `null` quand il n'y a pas de drop (la campagne
 * n'en donne pas à tous les combats, la tour si).
 */
export function EquipmentDropReward({
  drop,
  className,
}: {
  drop: EquipmentDrop | null
  className?: string
}) {
  const salvageItems = useSalvageItems()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { toast } = useToast()
  const [scrappedGold, setScrappedGold] = useState<number | null>(null)

  if (!drop) {
    return null
  }
  if (scrappedGold !== null) {
    return <EquipmentScrapped className={className} gold={scrappedGold} />
  }

  const scrapGold = economy.equip.salvageGold[drop.rarity] ?? 0

  const handleScrap = () => {
    salvageItems.mutate([drop.userEquipmentId], {
      onSuccess: (res) => {
        toast({
          title: 'Objet détruit',
          message: `+${res.goldEarned.toLocaleString('fr-FR')} or`,
          severity: TOAST_SEVERITY.SUCCESS,
        })
        setScrappedGold(res.goldEarned)
      },
    })
  }

  return (
    <EquipmentDropCard
      className={className}
      drop={drop}
      scrapGold={scrapGold}
      equipLevelScale={economy.equip.levelScale}
      isPending={salvageItems.isPending}
      onScrap={handleScrap}
    />
  )
}
