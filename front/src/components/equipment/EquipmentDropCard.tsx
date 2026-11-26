import { ChevronRight, Trash2 } from 'lucide-react'
import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { EquipmentDrop } from '../../api/equipment.api.ts'
import {
  SLOT_ICONS,
  SLOT_LABELS,
} from '../../components/collection/EquipmentSlotsPanel.tsx'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { currentLocale } from '../../i18n/index.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useEquipmentSets,
  useSalvageGold,
  useSalvageItems,
} from '../../queries/useEquipment.ts'
import {
  formatBonusKey,
  scaledBaseBonus,
  statColorVar,
} from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import { PopoverContent, PopoverRoot, PopoverTrigger } from '../ui/popover.tsx'

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
/**
 * Libellé d'une stat affichée avec sa valeur : « ATQ » plutôt que « % ATQ »,
 * puisque la valeur porte déjà son « % » (« ATQ +18% »). Les filtres, qui
 * listent les clés sans valeur, gardent `formatBonusKey` pour distinguer
 * « ATQ » de « % ATQ ».
 */
function statLabel(key: string): string {
  return formatBonusKey(key).replace(/^% /, '')
}

function formatValue(key: string, value: number): string {
  const rounded = Math.round(value)
  return key.endsWith('Pct') ? `+${rounded}%` : `+${rounded}`
}

/**
 * Stat principale de la pièce : `bonuses` ne porte qu'une seule clé (le seed
 * le garantit, cf. equipment-seed.test.ts), mise à l'échelle par le niveau
 * puis augmentée de `baseBoost` — via `scaledBaseBonus`, l'unique exemplaire
 * front de la formule serveur. D'où le passage de `equipLevelScale` par le
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
  return {
    key,
    value: scaledBaseBonus(base, drop.level, equipLevelScale, drop.baseBoost),
  }
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
  const { t } = useTranslation(['equipment', 'common'])
  const locale = currentLocale()
  const tier = RARITY_TIER[drop.rarity] ?? 1
  const SlotIcon = SLOT_ICONS[drop.slot]
  const main = mainStat(drop, equipLevelScale)
  const subs = drop.substats.slice(0, 4)

  return (
    <div
      className={cn(
        // `@container` : la fiche s'adapte à SA largeur, pas à celle de la
        // fenêtre — la même fiche vit dans un encart de 264px des écrans de
        // résultat et dans une cellule de la grille de l'inventaire.
        //
        // `w-full` n'est pas décoratif : `container-type: inline-size` isole la
        // largeur de la fiche de son contenu, donc dans un parent qui laisse
        // ses enfants se dimensionner eux-mêmes (une colonne `items-center`,
        // comme le panneau de victoire des tours) elle tombait à 0 pixel. Elle
        // doit tenir sa largeur de son parent, jamais de ce qu'il y a dedans.
        '@container relative flex w-full flex-col rounded-[18px] border-[1.5px] p-4 pt-4 text-left',
        'border-[color-mix(in_oklab,var(--rar)_42%,transparent)]',
        'bg-[linear-gradient(165deg,color-mix(in_oklab,var(--rar-light)_26%,var(--card)),var(--card)_62%)]',
        'shadow-[0_12px_30px_-20px_color-mix(in_oklab,var(--rar)_70%,transparent)]',
        className,
      )}
      style={RARITY_VARS[drop.rarity] as React.CSSProperties}
    >
      {/* en-tête : icône d'emplacement · titres · (sélection puis) rareté.
          Aligné en haut : un nom sur deux lignes ne doit pas décaler l'icône
          et la pastille de rareté vers le bas. */}
      <div className="flex items-start gap-3">
        <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(140deg,var(--rar),var(--rar-dark))] text-white shadow-[0_5px_14px_-6px_color-mix(in_oklab,var(--rar)_70%,transparent)]">
          <SlotIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-display text-[19px] font-extrabold leading-[1.1] tracking-[-0.01em] text-text">
            {drop.name}
          </div>
          {/* Une seule ligne : dans un encart étroit, « ARMURE · NIV. 7 »
              passait à la ligne sur le seul « 7 ». L'interlettrage se resserre
              plutôt que de laisser le niveau s'échapper. */}
          <div className="mt-[3px] font-mono text-[9.5px] whitespace-nowrap tracking-[0.14em] text-text-light @max-[300px]:tracking-[0.05em]">
            {t('equipment:drop.slotAndLevel', {
              slot: SLOT_LABELS[drop.slot].toUpperCase(),
              level: drop.level,
            })}
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
            title={t('equipment:drop.rarityTierTitle', {
              tier,
              max: TIER_MAX,
            })}
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
          <span className="font-display text-[15px] font-bold text-[color-mix(in_oklab,var(--sc)_70%,var(--text))]">
            {statLabel(main.key)}
          </span>
          <span className="ml-auto font-display text-[26px] font-extrabold leading-none tabular-nums text-text">
            {formatValue(main.key, main.value)}
          </span>
        </div>
      )}

      {/* sous-stats : 2 colonnes. À 3 sous-stats, la troisième se place seule
          sur la seconde rangée et garde la largeur d'une colonne — elle ne
          s'étire pas sur toute la fiche. Une rangée de 3 colonnes rendait les
          libellés trop étroits pour rester lisibles ; sous 300px de fiche, une
          seule colonne pour la même raison (« % PÉNÉTRATION ARMURE » n'y tient
          pas à deux). */}
      {subs.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-[7px] @max-[300px]:grid-cols-1">
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
                className="min-w-0 truncate font-display text-[12px] font-semibold whitespace-nowrap text-text-light"
                title={statLabel(s.key)}
              >
                {statLabel(s.key)}
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
            {t('equipment:drop.destroy')}
            <span className="font-mono text-[11px] whitespace-nowrap opacity-80">
              {t('common:gold.amountPlus', {
                amount: formatNumber(scrapGold ?? 0, locale),
              })}
            </span>
          </Button>
        </div>
      )}
    </div>
  )
}

const LOOT_TILE =
  'flex h-auto w-[104px] flex-col items-center gap-1 rounded-2xl border-[1.5px] border-border bg-card px-2 py-2.5 text-center whitespace-normal'

/**
 * Tuile compacte d'un gain d'écran de résultat : une icône, un titre, une
 * ligne de précision. Les pièces et la poussière partagent ce gabarit pour
 * qu'un balayage de vingt combats tienne en quelques rangées.
 */
export function LootTileBody({
  icon,
  iconClassName,
  title,
  subtitle,
}: {
  icon: ReactNode
  iconClassName?: string
  title: string
  subtitle: string
}) {
  return (
    <>
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <b className="w-full truncate font-display text-[13px] leading-tight text-text">
        {title}
      </b>
      <span className="w-full truncate font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-text-light">
        {subtitle}
      </span>
    </>
  )
}

const LOOT_ROW =
  'flex h-auto w-full items-center justify-start gap-3 rounded-2xl border-[1.5px] bg-card px-3 py-2.5 text-left whitespace-normal'

/**
 * Corps d'une ligne de pièce (fenêtre de farm) : icône d'emplacement teintée
 * par la rareté, « Arme · Sangsue », rareté + jauge + niveau, puis la stat
 * principale et le nombre de sous-stats. Une pièce détruite affiche l'or rendu
 * à la place des stats.
 */
function LootRowBody({
  drop,
  equipLevelScale,
  scrappedGold,
}: {
  drop: EquipmentDrop
  equipLevelScale: number
  scrappedGold: number | null
}) {
  const { t } = useTranslation(['equipment', 'common'])
  const { data: sets } = useEquipmentSets()
  const setLabel = useMemo(
    () => sets?.sets.find((s) => s.key === drop.setKey)?.label ?? drop.setKey,
    [sets, drop.setKey],
  )
  const SlotIcon = SLOT_ICONS[drop.slot]
  const tier = RARITY_TIER[drop.rarity] ?? 1
  const main = mainStat(drop, equipLevelScale)
  const subCount = drop.substats.length
  // Stat principale, ou l'or rendu une fois la pièce détruite. Sur téléphone
  // elle passe sous la rareté : à côté, elle écrasait le nom de la pièce.
  const statNode =
    scrappedGold !== null ? (
      <span className="font-display text-[13px] font-extrabold text-primary">
        {t('common:gold.amountPlus', {
          amount: formatNumber(scrappedGold, currentLocale()),
        })}
      </span>
    ) : main ? (
      <span
        className="w-fit whitespace-nowrap rounded-md px-2 py-0.5 font-display text-[13px] font-extrabold"
        style={{
          color: statColorVar(main.key),
          backgroundColor: `color-mix(in oklab, ${statColorVar(main.key)} 12%, var(--card))`,
        }}
      >
        {statLabel(main.key)} {formatValue(main.key, main.value)}
      </span>
    ) : null
  return (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(140deg,var(--rar),var(--rar-dark))] text-white shadow-[0_5px_14px_-6px_color-mix(in_oklab,var(--rar)_70%,transparent)]">
        <SlotIcon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[15px] font-bold leading-tight text-text">
          {SLOT_LABELS[drop.slot]}
          <span className="font-medium text-text-light"> · {setLabel}</span>
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.08em]">
          <span className="text-[var(--rar)]">
            {RARITY_LABEL_FR[drop.rarity]}
          </span>
          <span className="inline-flex gap-0.5" aria-hidden>
            {Array.from({ length: TIER_MAX }, (_, i) => i + 1).map((i) => (
              <span
                key={i}
                className={cn(
                  'h-[5px] w-[5px] rounded-full',
                  i <= tier ? 'bg-[var(--rar)]' : 'bg-border',
                )}
              />
            ))}
          </span>
          <span className="text-text-light/70">
            {t('equipment:drop.levelShort', { level: drop.level })}
          </span>
        </span>
        <span className="flex sm:hidden">{statNode}</span>
      </span>
      <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        {statNode}
        {scrappedGold === null && (
          <span className="whitespace-nowrap font-mono text-[10px] text-text-light/70">
            {subCount > 0
              ? t('equipment:drop.substats', { count: subCount })
              : t('equipment:drop.noSubstats')}
          </span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-light/50" />
    </>
  )
}

export function LootTile({
  className,
  ...body
}: Parameters<typeof LootTileBody>[0] & { className?: string }) {
  return (
    <div className={cn(LOOT_TILE, className)}>
      <LootTileBody {...body} />
    </div>
  )
}

/**
 * Pièce obtenue en fin de combat, en tuile compacte : l'emplacement et le
 * set suffisent à décider si elle vaut un regard. Un clic ouvre la fiche
 * complète (stats, bouton « Détruire ») ; une pièce détruite reste à sa place,
 * estompée, avec l'or rendu.
 */
export function EquipmentDropReward({
  drop,
  variant = 'tile',
}: {
  drop: EquipmentDrop | null
  /**
   * `tile` : tuile compacte (écran de victoire). `row` : ligne pleine largeur
   * avec set, rareté et stat principale (fenêtre de farm).
   */
  variant?: 'tile' | 'row'
}) {
  const { t } = useTranslation(['equipment', 'common'])
  const salvageItems = useSalvageItems()
  const salvageGold = useSalvageGold()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [scrappedGold, setScrappedGold] = useState<number | null>(null)

  if (!drop) {
    return null
  }

  const SlotIcon = SLOT_ICONS[drop.slot]
  const scrapped = scrappedGold !== null

  const handleScrap = () => {
    salvageItems.mutate([drop.userEquipmentId], {
      onSuccess: (res) => {
        toast({
          title: t('equipment:drop.destroyedToastTitle'),
          message: t('common:gold.amountPlus', {
            amount: formatNumber(res.goldEarned, currentLocale()),
          }),
          severity: TOAST_SEVERITY.SUCCESS,
        })
        setScrappedGold(res.goldEarned)
        setOpen(false)
      },
    })
  }

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'row' ? (
          <Button
            variant="outline"
            disabled={scrapped}
            aria-label={t('equipment:drop.seeDetails', { name: drop.name })}
            className={cn(
              LOOT_ROW,
              'border-[color-mix(in_oklab,var(--rar)_30%,transparent)] hover:bg-[color-mix(in_oklab,var(--rar-light)_16%,var(--card))]',
            )}
            style={RARITY_VARS[drop.rarity] as React.CSSProperties}
          >
            <LootRowBody
              drop={drop}
              equipLevelScale={economy.equip.levelScale}
              scrappedGold={scrappedGold}
            />
          </Button>
        ) : (
          <Button
            variant="outline"
            disabled={scrapped}
            aria-label={t('equipment:drop.seeDetails', { name: drop.name })}
            className={cn(
              LOOT_TILE,
              'border-[color-mix(in_oklab,var(--rar)_42%,transparent)] hover:bg-[color-mix(in_oklab,var(--rar-light)_22%,var(--card))]',
            )}
            style={RARITY_VARS[drop.rarity] as React.CSSProperties}
          >
            <LootTileBody
              icon={<SlotIcon className="h-5 w-5" />}
              iconClassName="bg-[linear-gradient(140deg,var(--rar),var(--rar-dark))] text-white"
              title={SLOT_LABELS[drop.slot]}
              subtitle={
                scrapped
                  ? t('common:gold.amountPlus', {
                      amount: formatNumber(scrappedGold, currentLocale()),
                    })
                  : drop.setKey
              }
            />
          </Button>
        )}
      </PopoverTrigger>
      {/* Sur un petit écran la fiche est plus haute que la place disponible
          au-dessus comme au-dessous de la ligne : elle se limite à la hauteur
          offerte par Radix et défile, au lieu de sortir de l'écran. */}
      <PopoverContent className="max-h-[var(--radix-popover-content-available-height)] w-[300px] overflow-y-auto overscroll-contain rounded-[18px] border-0 bg-transparent p-0 shadow-none">
        <EquipmentDropCard
          drop={drop}
          scrapGold={salvageGold([drop])}
          equipLevelScale={economy.equip.levelScale}
          isPending={salvageItems.isPending}
          onScrap={handleScrap}
        />
      </PopoverContent>
    </PopoverRoot>
  )
}
