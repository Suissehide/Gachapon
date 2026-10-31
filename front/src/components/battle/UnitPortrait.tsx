import {
  Angry,
  BicepsFlexed,
  Crosshair,
  Droplet,
  Flag,
  Flame,
  type LucideIcon,
  Shield,
  ShieldOff,
  ShieldPlus,
  Skull,
  Swords,
  Zap,
} from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import type { UnitStatus } from '../../api/combat.api'
import type { CardElement } from '../../constants/card.constant'
import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import type { SceneUnit } from './types'

type Props = {
  unit: SceneUnit
  /** Whether this unit is currently the attacker (triggers the lunge animation). */
  isActing: boolean
  /** Whether this unit is the current target (triggers the shake animation). */
  isTargeted: boolean
  /** Incrémenté à chaque frappe : relance l'élan ou la secousse, même si l'unité frappe deux fois de suite. */
  strikeSeq: number
  /** Vitesse de lecture de la scène, appliquée à la durée des animations. */
  speed: number
  /** Boss layout = bigger portrait centered (boss is alone in its row). */
  enlarged?: boolean
  /** Show passive badge label (optional) */
  passiveBadge?: string | null
  /** Position on the floating number layer, if any */
  damageFloat?: {
    value: number
    key: number
    kind: 'damage' | 'heal' | 'dodge'
  } | null
}

const PLACEHOLDER_RARITY = 'COMMON' as const

const lunge = (dy: number): Keyframe[] => [
  { transform: 'translateY(0)' },
  { transform: `translateY(${dy}px)`, offset: 0.4 },
  { transform: 'translateY(0)' },
]
const LUNGE_MS = 400
const SHAKE: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-5px)' },
  { transform: 'translateX(5px)' },
  { transform: 'translateX(-3px)' },
  { transform: 'translateX(0)' },
]
const SHAKE_MS = 320

/**
 * Players (side A) sit at the bottom and lunge UP. Enemies (side B) sit at the
 * top and lunge DOWN. Targeted units shake regardless of side. Web Animations
 * plutôt qu'une classe CSS : l'animation va au bout même quand la scène retire
 * l'état, et chaque frappe la relance (double coup d'un même attaquant).
 */
function useStrikeAnimation(
  kind: 'lunge' | 'shake' | null,
  strikeSeq: number,
  speed: number,
  isAlly: boolean,
) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!kind || strikeSeq === 0) {
      return
    }
    const [frames, ms] =
      kind === 'lunge'
        ? [lunge(isAlly ? -14 : 14), LUNGE_MS]
        : [SHAKE, SHAKE_MS]
    ref.current?.animate(frames, { duration: ms / speed, easing: 'ease' })
  }, [kind, strikeSeq, speed, isAlly])
  return ref
}

/** Statut rendu en puce ; la jauge d'ultime a son propre rendu (UltimateGauge). */
type ChipKey = Exclude<UnitStatus['key'], 'ULTIMATE'>
type ChipStatus = UnitStatus & { key: ChipKey }

const isChipStatus = (s: UnitStatus): s is ChipStatus => s.key !== 'ULTIMATE'

const STATUS_STYLE: Record<ChipKey, { icon: LucideIcon; className: string }> = {
  BURN: { icon: Flame, className: 'text-orange-600' },
  POISON: { icon: Droplet, className: 'text-lime-700' },
  STUN: { icon: Zap, className: 'text-yellow-700' },
  WEAKEN: { icon: Swords, className: 'text-rose-600' },
  SUNDER: { icon: ShieldOff, className: 'text-rose-600' },
  SHIELD: { icon: Shield, className: 'text-sky-600' },
  HUNTED: { icon: Crosshair, className: 'text-red-600' },
  EMPOWER: { icon: BicepsFlexed, className: 'text-emerald-600' },
  FORTIFY: { icon: ShieldPlus, className: 'text-emerald-600' },
  BANNER: { icon: Flag, className: 'text-emerald-600' },
  FURY: { icon: Angry, className: 'text-emerald-600' },
}

function StatusChip({ status }: { status: ChipStatus }) {
  const { t } = useTranslation('combat')
  const locale = currentLocale()
  // Clés littérales : une clé construite échappe à check-i18n-keys.mjs.
  const labels: Record<ChipKey, string> = {
    BURN: t('unitStatus.BURN'),
    POISON: t('unitStatus.POISON'),
    STUN: t('unitStatus.STUN'),
    WEAKEN: t('unitStatus.WEAKEN'),
    SUNDER: t('unitStatus.SUNDER'),
    SHIELD: t('unitStatus.SHIELD'),
    HUNTED: t('unitStatus.HUNTED'),
    EMPOWER: t('unitStatus.EMPOWER'),
    FORTIFY: t('unitStatus.FORTIFY'),
    BANNER: t('unitStatus.BANNER'),
    FURY: t('unitStatus.FURY'),
  }
  const value = formatNumber(status.value ?? 0, locale)
  const details: Partial<Record<ChipKey, string>> = {
    BURN: t('unitStatus.perTurn', { value }),
    POISON: t('unitStatus.perTurn', { value }),
    WEAKEN: t('unitStatus.pct', { value }),
    SUNDER: t('unitStatus.pct', { value }),
    SHIELD: t('unitStatus.shield', { value }),
    EMPOWER: t('unitStatus.atkUp', { value }),
    BANNER: t('unitStatus.atkUp', { value }),
    FORTIFY: t('unitStatus.defUp', { value }),
    FURY: t('unitStatus.dmgUp', { value }),
  }
  const detail = details[status.key] ?? null
  // Durée si l'effet en a une, sinon sa valeur (bouclier restant, bonus en %).
  const badge =
    status.turns ??
    (status.key === 'SHIELD' ? value : status.value ? `+${value}%` : null)
  const lines = [
    detail,
    status.turns !== undefined
      ? t('unitStatus.turns', { count: status.turns })
      : null,
  ].filter((l): l is string => l !== null)
  const { icon: Icon, className } = STATUS_STYLE[status.key]
  // Bulle CSS plutôt que `title` : le délai natif du navigateur est trop long.
  // Un bouton pour que le tap mobile (focus) l'ouvre aussi.
  return (
    <button
      type="button"
      aria-label={[labels[status.key], ...lines].join(' · ')}
      className={`group relative inline-flex h-5 cursor-help items-center gap-0.5 rounded-full border border-border bg-card/90 px-1.5 shadow-sm text-[10px] font-bold ${className}`}
    >
      <Icon className="h-3 w-3" />
      <span className="font-mono tabular-nums">{badge}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute right-full top-0 z-50 mr-1.5 hidden w-max max-w-[180px] rounded-md border border-border bg-card px-2 py-1 text-left text-[11px] font-normal text-text shadow-md group-hover:block group-focus:block"
      >
        <span className="block font-bold">{labels[status.key]}</span>
        {lines.map((l) => (
          <span key={l} className="block text-text-light">
            {l}
          </span>
        ))}
      </span>
    </button>
  )
}

/** Colonne posée sur la carte, coin haut-droit (le haut-gauche porte niveau et élément). */
function StatusRow({ unit }: { unit: SceneUnit }) {
  return (
    <div className="pointer-events-auto absolute right-1.5 top-1.5 z-30 flex flex-col items-end gap-1">
      {unit.alive &&
        (unit.statuses ?? [])
          .filter(isChipStatus)
          .map((s) => <StatusChip key={s.key} status={s} />)}
    </div>
  )
}

export function UnitPortrait({
  unit,
  isActing,
  isTargeted,
  strikeSeq,
  speed,
  enlarged,
}: Props) {
  const { t } = useTranslation('combat')
  const locale = currentLocale()
  const hpPct = Math.max(0, (unit.currentHp / unit.maxHp) * 100)
  const isDead = !unit.alive
  const isAlly = unit.side === 'A'

  // Three-tier HP color: green (>60%) → orange (30–60%) → red (<30%).
  const hpBarClass =
    hpPct <= 30
      ? 'bg-gradient-to-r from-rose-500 to-red-600'
      : hpPct <= 60
        ? 'bg-gradient-to-r from-orange-400 to-amber-500'
        : isAlly
          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
          : 'bg-gradient-to-r from-emerald-400 to-emerald-500'

  const rootRef = useStrikeAnimation(
    isActing ? 'lunge' : isTargeted ? 'shake' : null,
    strikeSeq,
    speed,
    isAlly,
  )

  const ringClass = isActing
    ? 'ring-4 ring-amber-400/60 shadow-[0_14px_30px_-12px_rgba(245,158,11,0.55)]'
    : ''

  // Le back ne renseigne `setName` que pour les alliés (`u.card.set?.name`
  // dans `sim-units.ts`) : côté ennemi, ce repli est le cas NOMINAL, affiché
  // sur chaque portrait de chaque combat — pas un cas limite. Deux appels
  // littéraux plutôt qu'un `t(cond ? … : …)` : une clé construite
  // dynamiquement sort du filet de `check-i18n-keys.mjs` (angle mort n°1).
  const setFallback = isAlly
    ? t('unitPortrait.setFallbackAlly')
    : t('unitPortrait.setFallbackEnemy')

  return (
    <div
      ref={rootRef}
      className={`relative flex flex-col items-center gap-2 transition-transform ${
        enlarged ? 'scale-[1.18]' : ''
      }`}
      style={{ transformOrigin: 'center center' }}
    >
      {/* Card area */}
      <div
        className={`relative w-full transition-all ${ringClass} ${
          isDead ? 'grayscale brightness-95' : ''
        } rounded-[14px]`}
      >
        <div className="relative aspect-[2/3] w-full">
          <CardDisplay
            rarity={unit.rarity ?? PLACEHOLDER_RARITY}
            name={unit.name ?? unit.id}
            setName={unit.setName ?? setFallback}
            imageUrl={unit.imageUrl ?? null}
            variant={unit.variant ?? 'NORMAL'}
            isOwned
            interactive={false}
            compact
            level={isAlly ? unit.level : null}
            element={(unit.element ?? null) as CardElement | null}
          />
          <StatusRow unit={unit} />
          {isDead && (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center animate-[battleSkullIn_0.3s_ease]">
              <Skull className="h-12 w-12 text-text-light drop-shadow-md" />
            </div>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div className="w-full">
        <div className="relative h-2 overflow-hidden rounded-full bg-[rgba(27,23,38,0.1)]">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width,background] duration-300 ease-out ${hpBarClass}`}
            style={{ width: `${hpPct}%` }}
          />
        </div>
        <UltimateGauge unit={unit} />
        <p className="mt-1 text-center font-mono text-[11px] tabular-nums text-text-light">
          {formatNumber(Math.max(0, Math.round(unit.currentHp)), locale)}{' '}
          <span className="opacity-60">
            / {formatNumber(unit.maxHp, locale)}
          </span>
        </p>
      </div>
    </div>
  )
}

/**
 * Jauge d'ultime : un cran par action jouée depuis le dernier ultime, sur
 * `cadence - 1` crans (statut `ULTIMATE` des `TURN_END`, `value` / `turns`) :
 * l'ultime est la `cadence`-ième action, il part donc jauge pleine.
 * Absente tant qu'aucun `TURN_END` n'est passé et pour les unités sans
 * archétype (ennemis).
 */
/** Crans possibles d'une jauge (cadence maximale 4), numérotés à partir de 1. */
const GAUGE_SLOTS = [1, 2, 3] as const

function UltimateGauge({ unit }: { unit: SceneUnit }) {
  const { t } = useTranslation('combat')
  const gauge = unit.statuses?.find((s) => s.key === 'ULTIMATE')
  if (!gauge || !unit.alive || !gauge.turns) {
    return null
  }
  const cadence = gauge.turns
  const charge = gauge.value ?? 0
  return (
    <div
      className="mt-1 flex h-1.5 w-full gap-0.5"
      title={t('unitStatus.ultimateGauge', { charge, cadence })}
    >
      {GAUGE_SLOTS.slice(0, cadence - 1).map((slot) => (
        <div
          key={slot}
          className={cn(
            'flex-1 rounded-full transition-colors duration-300',
            slot <= charge ? 'bg-primary' : 'bg-[rgba(27,23,38,0.1)]',
          )}
        />
      ))}
    </div>
  )
}
