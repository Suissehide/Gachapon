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
import { useTranslation } from 'react-i18next'

import type { UnitStatus } from '../../api/combat.api'
import type { CardElement } from '../../constants/card.constant'
import { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { CardDisplay } from '../shared/tcg-card/CardDisplay.tsx'
import type { SceneUnit } from './types'

type Props = {
  unit: SceneUnit
  /** Whether this unit is currently the attacker (triggers the lunge animation). */
  isActing: boolean
  /** Whether this unit is the current target (triggers the shake animation). */
  isTargeted: boolean
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

const STATUS_STYLE: Record<
  UnitStatus['key'],
  { icon: LucideIcon; className: string }
> = {
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

function StatusChip({ status }: { status: UnitStatus }) {
  const { t } = useTranslation('combat')
  const locale = currentLocale()
  // Clés littérales : une clé construite échappe à check-i18n-keys.mjs.
  const labels: Record<UnitStatus['key'], string> = {
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
  const details: Partial<Record<UnitStatus['key'], string>> = {
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
        (unit.statuses ?? []).map((s) => <StatusChip key={s.key} status={s} />)}
    </div>
  )
}

export function UnitPortrait({ unit, isActing, isTargeted, enlarged }: Props) {
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

  // Players (side A) sit at the bottom and lunge UP. Enemies (side B) sit at the
  // top and lunge DOWN. Targeted units shake regardless of side.
  const animClass = isActing
    ? isAlly
      ? 'animate-[battleLungeUp_0.4s_ease]'
      : 'animate-[battleLungeDown_0.4s_ease]'
    : isTargeted
      ? 'animate-[battleShake_0.32s_ease]'
      : ''

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
      className={`relative flex flex-col items-center gap-2 transition-transform ${animClass} ${
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
