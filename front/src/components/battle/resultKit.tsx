import type { TFunction } from 'i18next'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Coins,
  Pause,
  RotateCcw,
  Sparkles,
  Star,
  Swords,
  TriangleAlert,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import {
  Children,
  isValidElement,
  type ReactNode,
  useEffect,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'

import type { CardDrop, SweepRunLot } from '../../api/campaign.api.ts'
import type { TeamUnit } from '../../api/combat.api.ts'
import type { EquipmentDrop } from '../../api/equipment.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { computeLevel, xpForLevel } from '../../utils/level.ts'
import { SLOT_ICONS, SLOT_LABELS } from '../collection/EquipmentSlotsPanel.tsx'
import {
  EquipmentDropReward,
  LootTile,
} from '../equipment/EquipmentDropCard.tsx'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'
import { TeamPowerVerdict } from './BattlePrepModal.tsx'

// Shared visual language for the battle-result popups (victory / defeat) and the
// campaign farm-result popup, so they stay uniform. The animations referenced
// here (`battleResultIn`, `battleBadgePop`) are global keyframes.

// Outer shell: rounded cream panel that slides in, with an optional amber halo
// burst behind the badge. Children are stacked and centered.
//
// C'est ici que vit la hauteur max : `PopupContent` est seulement centré en
// `fixed`, sans plafond ni défilement, donc un panneau plus haut que la
// fenêtre (une victoire avec carte + équipement + barre d'XP, par exemple)
// débordait hors écran, boutons compris, sans moyen d'y accéder.
export function ResultPanel({
  halo = false,
  children,
}: {
  halo?: boolean
  children: ReactNode
}) {
  return (
    <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto overflow-x-hidden overscroll-contain rounded-[26px] px-6 py-8 sm:px-8 animate-[battleResultIn_0.4s_ease]">
      {halo && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-48"
          style={{
            background:
              'radial-gradient(50% 60% at 50% 50%, rgba(245,158,11,0.3), transparent 70%)',
          }}
          aria-hidden
        />
      )}
      <div className="relative flex flex-col items-center text-center">
        {children}
      </div>
    </div>
  )
}

// Circular gradient badge with a pop animation. `className` carries the gradient
// + shadow (amber for a win, slate for a loss).
export function ResultBadge({
  icon,
  className,
}: {
  icon: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex h-16 w-16 items-center justify-center rounded-full text-white animate-[battleBadgePop_0.5s_cubic-bezier(0.2,1.6,0.4,1)]',
        className,
      )}
    >
      {icon}
    </div>
  )
}

export const RESULT_BADGE_WIN =
  'bg-gradient-to-br from-amber-400 to-orange-500 shadow-[0_12px_28px_-8px_rgba(245,158,11,0.7)]'
export const RESULT_BADGE_LOSS =
  'bg-gradient-to-br from-slate-400 to-slate-600 shadow-md'
// Draw / timeout — indigo, distinct from both the amber win and the slate loss.
export const RESULT_BADGE_TIMEOUT =
  'bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-md'

export function RewardTile({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode
  label: string
  value: number
  tone: string
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white p-3">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${tone}1f`, color: tone }}
      >
        {icon}
      </span>
      <b className="font-display text-lg tabular-nums text-text">
        +{formatNumber(value, currentLocale())}
      </b>
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-text-light/70">
        {label}
      </span>
    </div>
  )
}

/**
 * Carte obtenue, dessinée plutôt que décrite : c'est le seul moment où on la
 * découvre, la réduire à une ligne de texte gâchait la récompense. Partagé par
 * l'écran de victoire et le résultat de balayage, qui affichaient jusqu'ici
 * deux rendus différents pour le même gain.
 *
 * Rien autour de l'illustration : ni libellé au-dessus, ni cadre derrière. La
 * carte porte déjà son nom, son extension et sa bordure de rareté ; l'encart
 * blanc n'ajoutait qu'un second cadre autour du premier. C'est la rangée
 * (`DropRail`) qui donne aux récompenses leur gabarit commun, pas une boîte.
 *
 * Seule marque posée dessus : la pastille « Nouveau » d'une carte encore
 * inconnue — même pastille, mêmes couleurs et même coin qu'au tirage
 * (`getSpecialBadges` dans machine/reveal/RevealGrid.tsx), pour que « je viens
 * de la débloquer » se lise pareil quel que soit l'écran qui l'annonce.
 */
export function CardDropReward({
  drop,
  className,
}: {
  drop: CardDrop
  className?: string
}) {
  const { t } = useTranslation('machine')
  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="relative aspect-[2/3] w-full max-w-[190px]">
        {!drop.wasDuplicate && (
          <span className="pointer-events-none absolute top-2 right-2 z-20 flex items-center gap-1 rounded-full bg-emerald-500/95 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/40">
            <Star className="h-3 w-3" strokeWidth={2.5} />
            {t('machine:badges.newMasculine')}
          </span>
        )}
        <TcgCardFace
          rarity={drop.rarity}
          name={drop.name}
          setName={drop.setName}
          imageUrl={drop.imageUrl}
          variant="NORMAL"
          isOwned
          element={(drop.element ?? null) as CardElement | null}
        />
      </div>
    </div>
  )
}

// L'XP en bleu : le violet est la couleur de l'énergie, et les deux
// s'affichent côte à côte dans les récompenses de combat.
export const XP_TONE = '#3b82f6'

/** Poussière gagnée, au même gabarit qu'une pièce d'équipement. */
export function DustLootTile({ amount }: { amount: number }) {
  const { t } = useTranslation('combat')
  return (
    <LootTile
      icon={<Sparkles className="h-5 w-5" />}
      iconClassName="bg-sky-400/15 text-sky-500"
      title={`+${formatNumber(amount, currentLocale())}`}
      subtitle={t('combat:battle.rewards.dust')}
    />
  )
}

/** Énergie gagnée, quand c'est elle le lot de la victoire. */
export function EnergyLootTile({ amount }: { amount: number }) {
  const { t } = useTranslation('combat')
  return (
    <LootTile
      icon={<Zap className="h-5 w-5" />}
      iconClassName="bg-violet-500/15 text-violet-500"
      title={`+${formatNumber(amount, currentLocale())}`}
      subtitle={t('combat:battle.rewards.energy')}
    />
  )
}

/**
 * Grille des gains compacts d'un écran de résultat : poussière, énergie, puis
 * une tuile par pièce. Elle passe à la ligne au lieu de défiler, pour qu'un
 * balayage se lise d'un coup d'œil.
 */
export function LootGrid({ children }: { children: ReactNode }) {
  if (Children.toArray(children).length === 0) {
    return null
  }
  return (
    <div className="mt-4 flex w-full flex-wrap justify-center gap-2">
      {children}
    </div>
  )
}

// Largeur d'un encart de la rangée : assez étroite pour qu'un second encart
// dépasse du bord du panneau et annonce le défilement.
const DROP_TILE = 'w-[264px] shrink-0 snap-start [&>*]:w-full'

/**
 * Rangée des cartes obtenues sur un écran de résultat.
 *
 * À partir de deux, elles deviennent des encarts de largeur fixe qui défilent
 * horizontalement plutôt que de repousser les boutons du panneau. Une carte
 * seule prend le même encart, centré, pour garder le même gabarit d'un combat
 * à l'autre.
 *
 * Les enfants conditionnels (`{drop && <Fiche />}`) sont attendus : `false` ne
 * compte pas comme une récompense. En revanche un composant qui rend `null`
 * de lui-même compte pour un — d'où les gardes chez les appelants.
 */
export function DropRail({ children }: { children: ReactNode }) {
  const items = Children.toArray(children)
  if (items.length === 0) {
    return null
  }
  if (items.length === 1) {
    return (
      <div className="mt-4 flex w-full justify-center">
        <div className={cn('flex max-w-full', DROP_TILE)}>{items[0]}</div>
      </div>
    )
  }
  // La rangée déborde jusqu'aux bords du panneau (marges négatives + rembourrage
  // interne) : le troisième encart est ainsi coupé par le bord au lieu de
  // s'arrêter pile dedans, et le défilement se voit sans avoir à le deviner.
  // Le rembourrage de fin est plus large que celui de début pour que le dernier
  // encart ne vienne pas coller au bord du panneau en fin de défilement.
  //
  // `scroll-pl-*` doit reprendre le rembourrage de début de la piste : sans
  // lui, le premier point d'accrochage tombe à 24 px du début du contenu,
  // `scrollLeft: 0` n'est plus une position valide, et l'accrochage obligatoire
  // décalait la rangée vers la droite de lui-même à l'ouverture de la fenêtre.
  return (
    <div className="-mx-6 mt-4 w-[calc(100%+3rem)] snap-x snap-mandatory scroll-pl-6 overflow-x-auto overscroll-x-contain pb-2 sm:-mx-8 sm:w-[calc(100%+4rem)] sm:scroll-pl-8 [scrollbar-width:thin]">
      {/* Le rembourrage vit sur la piste, pas sur le conteneur de défilement :
          un `padding-right` posé sur ce dernier n'est pas toujours compté dans
          la zone défilable, et le dernier encart collerait au bord. */}
      <div className="flex w-max items-stretch gap-3 pl-6 pr-10 sm:pl-8 sm:pr-12">
        {items.map((item, index) => (
          <div
            key={isValidElement(item) && item.key !== null ? item.key : index}
            className={cn('flex', DROP_TILE)}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Fenêtre de fin de combat multiple, partagée par la campagne et les tours.
 *
 * De haut en bas : où l'on a farmé et ce que ça a coûté, les deux totaux
 * (pièces, XP avec sa jauge de niveau), les ressources regroupées par type,
 * l'équipement en lignes triées par rareté, les cartes (campagne seulement),
 * puis le détail repliable combat par combat. La tour ne droppe pas de carte :
 * elle passe `cardDrops` vide et la rangée disparaît d'elle-même.
 */
export function FarmResultPopup({
  result,
  place,
  replay,
  defeat,
  onClose,
}: {
  result: FarmResult
  /** Où l'on a farmé : nom de l'étage ou de l'étape. */
  place?: string
  /** « Relancer » : absent, le bouton n'est pas proposé. */
  replay?: FarmReplay
  /**
   * De quoi réagir à un farm interrompu par les défaites : la puissance de
   * l'équipe face à la recommandée, et l'accès à l'éditeur d'équipe.
   */
  defeat?: FarmDefeatContext
  onClose: () => void
}) {
  const { t } = useTranslation('combat')
  const summary = summarizeRuns(result.runLots ?? [])
  return (
    <Popup
      open
      onOpenChange={(v) => {
        if (!v) {
          onClose()
        }
      }}
    >
      <PopupContent
        size="lg"
        className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
      >
        <Dialog.Title className="sr-only">
          {t(
            summary.stopped
              ? 'combat:farmResult.stoppedTitle'
              : 'combat:farmResult.title',
          )}
        </Dialog.Title>
        <ResultPanel halo={!summary.stopped}>
          <FarmHeader
            place={place}
            runs={result.runs}
            summary={summary}
            runLots={result.runLots ?? []}
            energySpent={result.energySpent}
            energyRefunded={result.energyRefunded}
          />
          {summary.stopped && (
            <FarmStoppedNotice summary={summary} defeat={defeat} />
          )}
          <div className="mt-6 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2">
            <TotalTile
              icon={<Coins className="h-5 w-5" />}
              tone="#f59e0b"
              label={t('combat:battle.rewards.gold')}
              value={result.totalGold}
            />
            <XpTotalTile
              totalXp={result.totalXp}
              xpBefore={result.xpBefore}
              levelBefore={result.levelBefore}
            />
          </div>
          <FarmResources
            dustDrops={result.dustDrops}
            energyDrops={result.energyDrops}
          />
          <FarmEquipment drops={result.equipmentDrops} />
          <FarmCards drops={result.cardDrops ?? []} />
          <FarmRunDetails
            runLots={result.runLots ?? []}
            equipmentDrops={result.equipmentDrops}
            // Avec des défaites, le détail s'ouvre de lui-même : c'est là
            // qu'on voit lesquelles.
            defaultOpen={summary.losses > 0}
          />
          <FarmActions
            runs={result.runs}
            energySpent={result.energySpent}
            replay={summary.stopped ? undefined : replay}
            onEditTeam={summary.stopped ? defeat?.onEditTeam : undefined}
            onClose={onClose}
          />
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}

type FarmDefeatContext = {
  team: TeamUnit[]
  recommendedPower: number
  onEditTeam: () => void
}

type RunSummary = {
  wins: number
  losses: number
  played: number
  skipped: number
  /** Le balayage s'est arrêté avant la fin (passages `SKIPPED`). */
  stopped: boolean
}

function summarizeRuns(runLots: SweepRunLot[]): RunSummary {
  const count = (o: SweepRunLot['outcome']) =>
    runLots.filter((lot) => lot.outcome === o).length
  const skipped = count('SKIPPED')
  return {
    wins: count('WIN'),
    losses: count('LOSS'),
    played: runLots.length - skipped,
    skipped,
    stopped: skipped > 0,
  }
}

type FarmReplay = { onReplay: () => void; disabled: boolean; pending: boolean }

function FarmHeader({
  place,
  runs,
  summary,
  runLots,
  energySpent,
  energyRefunded,
}: {
  place?: string
  runs: number
  summary: RunSummary
  runLots: SweepRunLot[]
  energySpent?: number
  energyRefunded?: number
}) {
  const { t } = useTranslation('combat')
  const locale = currentLocale()
  const { stopped } = summary
  return (
    <>
      <ResultBadge
        className={stopped ? RESULT_BADGE_LOSS : RESULT_BADGE_WIN}
        icon={
          stopped ? <Pause className="h-8 w-8" /> : <Zap className="h-8 w-8" />
        }
      />
      {place && (
        <p
          className={cn(
            'mt-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em]',
            stopped ? 'text-text-light' : 'text-primary',
          )}
        >
          {place}
        </p>
      )}
      <h2
        className={cn(
          'font-display text-3xl font-bold text-text',
          place ? 'mt-1.5' : 'mt-4',
        )}
      >
        {t(
          stopped
            ? 'combat:farmResult.stoppedTitle'
            : 'combat:farmResult.title',
        )}
      </h2>
      {stopped && (
        <p className="mt-2 text-[14.5px] text-text-light">
          {t('combat:farmResult.stoppedLead', {
            n: summary.played,
            total: runs,
          })}
        </p>
      )}
      <OutcomeStrip runLots={runLots} />
      <div className="mt-3.5 flex flex-wrap justify-center gap-1.5">
        <FarmChip icon={<Swords className="h-3.5 w-3.5" />}>
          {stopped
            ? t('combat:farmResult.runsPlayed', {
                played: summary.played,
                total: runs,
              })
            : t('combat:farmResult.runs', { count: runs })}
        </FarmChip>
        {energySpent !== undefined && energySpent > 0 && (
          <FarmChip
            icon={<Zap className="h-3.5 w-3.5" />}
            className="border-violet-500/25 bg-violet-500/8 text-violet-600"
          >
            {t('combat:farmResult.energySpent', {
              count: formatNumber(energySpent, locale),
            })}
          </FarmChip>
        )}
        {energyRefunded !== undefined && energyRefunded > 0 && (
          <FarmChip
            icon={<Zap className="h-3.5 w-3.5" />}
            className="border-emerald-500/25 bg-emerald-500/8 text-emerald-700"
          >
            {t('combat:farmResult.energyRefunded', {
              count: formatNumber(energyRefunded, locale),
            })}
          </FarmChip>
        )}
      </div>
    </>
  )
}

/**
 * Frise des combats sous le titre : vert pour une victoire, rouge pour une
 * défaite, pointillés pour un combat non joué. Masquée quand tout est gagné :
 * elle n'apprendrait rien de plus que le titre.
 */
function OutcomeStrip({ runLots }: { runLots: SweepRunLot[] }) {
  const { t } = useTranslation('combat')
  if (runLots.every((lot) => lot.outcome === 'WIN')) {
    return null
  }
  const cells = runLots.map((lot, i) => ({
    outcome: lot.outcome,
    key: `strip-${i + 1}`,
    title: t(OUTCOME_TITLE[lot.outcome], { n: i + 1 }),
  }))
  return (
    <ul
      aria-label={t('combat:farmResult.outcomeStrip')}
      className="mt-3.5 flex flex-wrap justify-center gap-1"
    >
      {cells.map(({ outcome, key, title }) => (
        <li
          key={key}
          title={title}
          className={cn(
            'flex h-[22px] w-[22px] items-center justify-center rounded-[7px] text-white',
            outcome === 'WIN' && 'bg-emerald-500',
            outcome === 'LOSS' && 'bg-red-500',
            outcome === 'SKIPPED' &&
              'border-[1.5px] border-dashed border-border',
          )}
        >
          <span className="sr-only">{title}</span>
          {outcome === 'WIN' && <Check className="h-3 w-3" strokeWidth={3} />}
          {outcome === 'LOSS' && <X className="h-3 w-3" strokeWidth={3} />}
        </li>
      ))}
    </ul>
  )
}

const OUTCOME_TITLE = {
  WIN: 'combat:farmResult.outcomeWin',
  LOSS: 'combat:farmResult.outcomeLoss',
  SKIPPED: 'combat:farmResult.outcomeSkipped',
} as const

/**
 * Encart d'un farm interrompu : pourquoi il s'est arrêté, ce qui a été rendu,
 * et la puissance de l'équipe face à la recommandée (même verdict que
 * l'aperçu de combat).
 */
function FarmStoppedNotice({
  summary,
  defeat,
}: {
  summary: RunSummary
  defeat?: FarmDefeatContext
}) {
  const { t } = useTranslation('combat')
  return (
    <div className="mt-5 w-full rounded-2xl border border-red-200 bg-red-50 p-3.5 text-left">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/12 text-red-600">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <b className="block text-[14.5px] text-text">
            {t('combat:farmResult.stoppedCardTitle', { count: summary.losses })}
          </b>
          <p className="mt-0.5 text-[13px] leading-snug text-text-light">
            {t('combat:farmResult.stoppedCardText', {
              count: summary.skipped,
            })}
          </p>
        </div>
      </div>
      {defeat && (
        <TeamPowerVerdict
          team={defeat.team}
          recommendedPower={defeat.recommendedPower}
        />
      )}
    </div>
  )
}

/** Poussière et énergie regroupées par type : un total, et le nombre de lots. */
function FarmResources({
  dustDrops,
  energyDrops,
}: {
  dustDrops: number[]
  energyDrops: number[]
}) {
  const { t } = useTranslation('combat')
  const totalDust = dustDrops.reduce((sum, amount) => sum + amount, 0)
  const totalEnergy = energyDrops.reduce((sum, amount) => sum + amount, 0)
  if (totalDust <= 0 && totalEnergy <= 0) {
    return null
  }
  return (
    <FarmSection title={t('combat:farmResult.resources')}>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {totalDust > 0 && (
          <ResourceTile
            icon={<Sparkles className="h-[18px] w-[18px]" />}
            iconClassName="bg-sky-400/15 text-sky-500"
            label={t('combat:battle.rewards.dust')}
            value={totalDust}
            lots={dustDrops.length}
          />
        )}
        {totalEnergy > 0 && (
          <ResourceTile
            icon={<Zap className="h-[18px] w-[18px]" />}
            iconClassName="bg-violet-500/15 text-violet-500"
            label={t('combat:battle.rewards.energy')}
            value={totalEnergy}
            lots={energyDrops.length}
          />
        )}
      </div>
    </FarmSection>
  )
}

/** Pièces en lignes, les plus rares d'abord : c'est ce qu'on cherche du regard. */
function FarmEquipment({ drops }: { drops: EquipmentDrop[] }) {
  const { t } = useTranslation('combat')
  if (drops.length === 0) {
    return null
  }
  const sorted = [...drops].sort(
    (a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0),
  )
  return (
    <FarmSection
      title={t('combat:farmResult.equipment')}
      count={t('combat:farmResult.pieces', { count: sorted.length })}
    >
      <div className="flex flex-col gap-2">
        {sorted.map((e) => (
          <EquipmentDropReward key={e.userEquipmentId} drop={e} variant="row" />
        ))}
      </div>
    </FarmSection>
  )
}

function FarmCards({ drops }: { drops: CardDrop[] }) {
  const { t } = useTranslation('combat')
  if (drops.length === 0) {
    return null
  }
  // Une même carte peut tomber plusieurs fois dans un balayage : la clé est
  // l'id de la carte suivi de son rang d'apparition (1re, 2e, …).
  const seen = new Map<string, number>()
  const keyed = drops.map((drop) => {
    const occurrence = (seen.get(drop.cardId) ?? 0) + 1
    seen.set(drop.cardId, occurrence)
    return { drop, key: `${drop.cardId}-${occurrence}` }
  })
  return (
    <FarmSection
      title={t('combat:farmResult.cards')}
      count={String(keyed.length)}
    >
      <DropRail>
        {keyed.map(({ drop, key }) => (
          <CardDropReward key={key} drop={drop} />
        ))}
      </DropRail>
    </FarmSection>
  )
}

/** Détail repliable : ce que chaque passage a rapporté, dans l'ordre. */
function FarmRunDetails({
  runLots,
  equipmentDrops,
  defaultOpen,
}: {
  runLots: SweepRunLot[]
  equipmentDrops: EquipmentDrop[]
  defaultOpen: boolean
}) {
  const { t } = useTranslation('combat')
  const [open, setOpen] = useState(defaultOpen)
  if (runLots.length === 0) {
    return null
  }
  // Les passages sont figés et ordonnés : leur rang est leur identité.
  const cells = runLots.map((lot, i) => ({
    lot,
    n: i + 1,
    key: `run-${i + 1}`,
    equipment:
      lot.equipmentIndex === null
        ? null
        : (equipmentDrops[lot.equipmentIndex] ?? null),
  }))
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-5 flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-text-light transition-colors hover:bg-text/5 hover:text-text"
      >
        {t('combat:farmResult.details')}
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="mt-2.5 grid w-full grid-cols-5 gap-1.5">
          {cells.map(({ key, n, lot, equipment }) => (
            <RunCell key={key} n={n} lot={lot} equipment={equipment} />
          ))}
        </div>
      )}
    </>
  )
}

function FarmActions({
  runs,
  energySpent,
  replay,
  onEditTeam,
  onClose,
}: {
  runs: number
  energySpent?: number
  replay?: FarmReplay
  /** Farm interrompu : « Revoir mon équipe » prend la place de « Relancer ». */
  onEditTeam?: () => void
  onClose: () => void
}) {
  const { t } = useTranslation('combat')
  const secondary = onEditTeam ? (
    <Button variant="outline" size="lg" onClick={onEditTeam} className="gap-2">
      <Users className="h-4 w-4" />
      {t('combat:battle.defeat.reviewTeam')}
    </Button>
  ) : replay ? (
    <Button
      variant="outline"
      size="lg"
      onClick={replay.onReplay}
      disabled={replay.disabled || replay.pending}
      className="gap-2"
    >
      <RotateCcw className="h-4 w-4" />
      {t('combat:farmResult.replay', { count: runs })}
      {energySpent !== undefined && energySpent > 0 && (
        <span className="inline-flex items-center gap-0.5 font-mono text-[11px] font-bold text-violet-600">
          <Zap className="h-3 w-3" />
          {formatNumber(energySpent, currentLocale())}
        </span>
      )}
    </Button>
  ) : null
  return (
    <div
      className={cn(
        'mt-6 grid w-full gap-2.5',
        secondary && 'sm:grid-cols-[1fr_1.25fr]',
      )}
    >
      {secondary}
      <Button size="lg" onClick={onClose} className="gap-2">
        {t('combat:farmResult.continue')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

/** Ce que la fenêtre de farm lit d'un balayage, tour ou campagne. */
export type FarmResult = {
  runs: number
  totalGold: number
  totalXp: number
  xpBefore: number
  levelBefore: number
  dustDrops: number[]
  energyDrops: number[]
  equipmentDrops: EquipmentDrop[]
  cardDrops?: CardDrop[]
  runLots?: SweepRunLot[]
  energySpent?: number
  energyRefunded?: number
}

const RARITY_RANK: Record<string, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
}

function FarmChip({
  icon,
  className,
  children,
}: {
  icon: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-white px-3 font-mono text-[11.5px] font-bold tracking-[0.04em] text-text-light',
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

/** Titre de section aligné à gauche, compteur discret, filet jusqu'au bord. */
function FarmSection({
  title,
  count,
  children,
}: {
  title: string
  count?: string
  children: ReactNode
}) {
  return (
    <section className="mt-5 w-full text-left">
      <div className="mb-2.5 flex items-center gap-2.5">
        <h3 className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light">
          {title}
        </h3>
        {count && (
          <span className="whitespace-nowrap font-mono text-[11px] text-text-light/60">
            {count}
          </span>
        )}
        <span className="h-px flex-1 bg-border" aria-hidden />
      </div>
      {children}
    </section>
  )
}

function TileIcon({ icon, tone }: { icon: ReactNode; tone: string }) {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ backgroundColor: `${tone}1f`, color: tone }}
    >
      {icon}
    </span>
  )
}

function TotalTile({
  icon,
  tone,
  label,
  value,
}: {
  icon: ReactNode
  tone: string
  label: string
  value: number
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-3.5 text-left">
      <TileIcon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-light/80">
          {label}
        </span>
        <b className="mt-1 block font-display text-2xl leading-none tabular-nums text-text">
          +{formatNumber(value, currentLocale())}
        </b>
      </div>
    </div>
  )
}

/**
 * Total d'XP avec la jauge du niveau atteint. La part déjà acquise avant le
 * farm reste en clair, le gain se remplit par-dessus ; après une montée de
 * niveau la jauge repart de zéro et un badge annonce le nouveau niveau.
 */
function XpTotalTile({
  totalXp,
  xpBefore,
  levelBefore,
}: {
  totalXp: number
  xpBefore: number
  levelBefore: number
}) {
  const { t } = useTranslation('combat')
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const curve = economy.xp
  const xpAfter = xpBefore + totalXp
  const levelAfter = computeLevel(xpAfter, curve)
  const leveledUp = levelAfter > levelBefore
  const atCap = levelAfter >= curve.levelCap
  const share = (xp: number, level: number) => {
    const start = xpForLevel(level, curve)
    const span = xpForLevel(level + 1, curve) - start
    return span > 0
      ? Math.min(100, Math.max(0, ((xp - start) / span) * 100))
      : 100
  }
  const pctBefore = leveledUp ? 0 : share(xpBefore, levelBefore)
  const pctAfter = atCap ? 100 : share(xpAfter, levelAfter)
  // La jauge part de l'état d'avant puis se remplit : l'œil voit le gain.
  const [shown, setShown] = useState(pctBefore)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pctAfter))
    return () => cancelAnimationFrame(id)
  }, [pctAfter])

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-white p-3.5 text-left">
      <TileIcon icon={<Star className="h-5 w-5" />} tone={XP_TONE} />
      <div className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-light/80">
          XP
          {leveledUp && (
            <span className="rounded-full bg-gradient-to-br from-blue-400 to-blue-600 px-1.5 py-0.5 text-[9.5px] tracking-[0.08em] text-white">
              {t('combat:farmResult.levelUp', { level: levelAfter })}
            </span>
          )}
        </span>
        <b className="mt-1 block font-display text-2xl leading-none tabular-nums text-text">
          +{formatNumber(totalXp, currentLocale())}
        </b>
        <div className="relative mt-2.5 h-1.5 overflow-hidden rounded-full bg-blue-500/10">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-blue-500/25"
            style={{ width: `${pctBefore}%` }}
          />
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-[width] delay-200 duration-900 ease-out motion-reduce:transition-none"
            style={{ width: `${shown}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-text-light/80">
          <span>
            {t('combat:farmResult.levelShort', { level: levelAfter })}
          </span>
          <span>{Math.round(pctAfter)} %</span>
        </div>
      </div>
    </div>
  )
}

function ResourceTile({
  icon,
  iconClassName,
  label,
  value,
  lots,
}: {
  icon: ReactNode
  iconClassName: string
  label: string
  value: number
  lots: number
}) {
  const { t } = useTranslation('combat')
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white py-2.5 pr-3.5 pl-2.5 text-left">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          iconClassName,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-light/80">
          {label}
        </span>
        <b className="block font-display text-lg leading-tight tabular-nums text-text">
          +{formatNumber(value, currentLocale())}
        </b>
      </div>
      <span className="ml-auto whitespace-nowrap font-mono text-[10.5px] text-text-light/70">
        {t('combat:farmResult.lots', { count: lots })}
      </span>
    </div>
  )
}

const RARITY_TOKEN: Record<string, string> = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  EPIC: 'var(--rarity-epic)',
  LEGENDARY: 'var(--rarity-legendary)',
}

/** Une case du détail par combat : ce que ce passage-là a rapporté. */
function RunCell({
  n,
  lot,
  equipment,
}: {
  n: number
  lot: SweepRunLot
  equipment: EquipmentDrop | null
}) {
  const { t } = useTranslation('combat')
  const c = runCellContent(lot, equipment, t)
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 pt-2 pb-2.5',
        lot.outcome === 'WIN' && 'border-border bg-white',
        lot.outcome === 'LOSS' && 'border-red-200 bg-red-50',
        lot.outcome === 'SKIPPED' &&
          'border-[1.5px] border-dashed border-border',
      )}
    >
      <span
        className={cn(
          'font-mono text-[9.5px] font-bold tracking-[0.1em]',
          lot.outcome === 'SKIPPED'
            ? 'text-text-light/40'
            : 'text-text-light/70',
        )}
      >
        {t('combat:farmResult.runShort', { n })}
      </span>
      <span
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-lg',
          c.iconClassName,
        )}
        style={c.iconStyle}
      >
        {c.icon}
      </span>
      <b
        className={cn(
          'max-w-full truncate font-display text-[12.5px] leading-tight',
          c.valueClassName ?? 'text-text',
        )}
      >
        {c.value}
      </b>
      <span
        className="max-w-full truncate font-mono text-[9.5px] text-text-light/80"
        style={c.captionStyle}
      >
        {c.caption}
      </span>
      {lot.cardIndex !== null && (
        <span className="font-mono text-[9px] font-bold text-emerald-600">
          {t('combat:farmResult.plusCard')}
        </span>
      )}
    </div>
  )
}

type RunCellContent = {
  icon: ReactNode
  iconClassName: string
  iconStyle?: React.CSSProperties
  value: string
  valueClassName?: string
  caption: string
  captionStyle?: React.CSSProperties
}

/** Ce que montre une case selon l'issue du passage et son lot. */
function runCellContent(
  lot: SweepRunLot,
  equipment: EquipmentDrop | null,
  t: TFunction<'combat'>,
): RunCellContent {
  if (lot.outcome === 'SKIPPED') {
    return {
      icon: <Pause className="h-4 w-4" />,
      iconClassName: 'text-text-light/40',
      value: '—',
      valueClassName: 'text-text-light/40',
      caption: t('combat:farmResult.skipped'),
    }
  }
  if (lot.outcome === 'LOSS') {
    return {
      icon: <X className="h-4 w-4" strokeWidth={3} />,
      iconClassName: 'bg-red-500/12 text-red-600',
      value: t('combat:farmResult.loss'),
      valueClassName: 'text-red-700',
      caption: t('combat:farmResult.noLot'),
    }
  }
  if (equipment) {
    const SlotIcon = SLOT_ICONS[equipment.slot]
    return {
      icon: <SlotIcon className="h-4 w-4" />,
      iconClassName: 'text-white',
      iconStyle: { background: RARITY_TOKEN[equipment.rarity] },
      value: SLOT_LABELS[equipment.slot],
      caption: RARITY_LABEL_FR[equipment.rarity] ?? equipment.rarity,
      captionStyle: { color: RARITY_TOKEN[equipment.rarity] },
    }
  }
  if (lot.energy > 0) {
    return {
      icon: <Zap className="h-4 w-4" />,
      iconClassName: 'bg-violet-500/15 text-violet-500',
      value: `+${formatNumber(lot.energy, currentLocale())}`,
      caption: t('combat:battle.rewards.energy'),
    }
  }
  return {
    icon: <Sparkles className="h-4 w-4" />,
    iconClassName: 'bg-sky-400/15 text-sky-500',
    value: `+${formatNumber(lot.dust, currentLocale())}`,
    caption: t('combat:battle.rewards.dust'),
  }
}
