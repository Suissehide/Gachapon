import type { LucideIcon } from 'lucide-react'
import { Gift } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'

import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'

/**
 * Coffre de récompense : coffre qui oscille, éclatement à l'ouverture, puis
 * butin révélé dans une gerbe (rayons, halo, étincelles) avec des tuiles qui
 * comptent jusqu'au montant. Partagé par la popup « Bon retour ! » et le
 * butin du monstre errant. Les keyframes (`returnChest*`, `claimParticle`)
 * vivent dans `_globals.css`.
 */

/** Durée de l'éclatement du coffre avant d'afficher le butin. */
export const CHEST_POP_MS = 420

export const chestEyebrowClass =
  'relative font-mono text-[11.5px] font-bold tracking-[0.24em] uppercase text-primary-dark'
export const chestTitleClass =
  'relative m-0 text-text font-display text-[34px] font-extrabold tracking-[-0.03em] leading-[1.05]'

const SPARK_COLORS = [
  'bg-primary',
  'bg-accent',
  'bg-currency-token',
  'bg-primary-light',
]
const SPARKS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2
  const dist = 80 + ((i * 37) % 50)
  return {
    color: SPARK_COLORS[i % SPARK_COLORS.length],
    tx: `${Math.round(Math.cos(angle) * dist)}px`,
    ty: `${Math.round(Math.sin(angle) * dist)}px`,
    delay: (i * 23) % 150,
  }
})

/** Compte de 0 à `target` en `durationMs` (ease-out cubique). */
export function useCountUp(target: number, delayMs: number, durationMs = 700) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now() + delayMs
    const step = (now: number) => {
      const p = Math.max(0, Math.min(1, (now - start) / durationMs))
      setValue(Math.round(target * (1 - (1 - p) ** 3)))
      if (p < 1) {
        frame = requestAnimationFrame(step)
      }
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, delayMs, durationMs])
  return value
}

/** Halo d'ambiance radial en haut de la popup. */
export function ChestGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%)]"
    />
  )
}

function Rays({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'absolute h-[260px] w-[260px] rounded-full bg-[repeating-conic-gradient(from_0deg,color-mix(in_srgb,var(--primary)_16%,transparent)_0_10deg,transparent_10deg_30deg)] transition-opacity duration-400 [mask:radial-gradient(circle,black_30%,transparent_70%)]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      style={
        visible
          ? { animation: 'returnChestSpin 14s linear infinite' }
          : undefined
      }
    />
  )
}

function Halo() {
  return (
    <div
      aria-hidden
      className="absolute h-[190px] w-[190px] rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--primary-light)_42%,transparent),color-mix(in_srgb,var(--primary-light)_12%,transparent)_55%,transparent_70%)]"
      style={{ animation: 'returnChestPulse 2.4s ease-in-out infinite' }}
    />
  )
}

/** Coffre fermé : oscille au repos, éclate quand `popping`. */
export function ChestButton({
  label,
  popping,
  onOpen,
}: {
  label: string
  popping: boolean
  onOpen: () => void
}) {
  return (
    <div className="relative mt-3.5 mb-[22px] grid h-[190px] place-items-center">
      <Rays visible={popping} />
      <Halo />
      <button
        type="button"
        aria-label={label}
        onClick={onOpen}
        className="relative grid h-[118px] w-[118px] cursor-pointer place-items-center rounded-[30px] bg-linear-160 from-primary-light via-primary to-currency-token text-white shadow-[0_0_0_6px_var(--card),0_0_0_8px_var(--amber-soft),0_18px_30px_-12px_color-mix(in_srgb,var(--currency-token)_70%,transparent),inset_0_-6px_0_rgba(0,0,0,0.08)] transition-transform hover:scale-105"
        style={{
          animation: popping
            ? 'returnChestPop 500ms cubic-bezier(.2,1.4,.4,1) forwards'
            : 'returnChestWobble 2.8s ease-in-out infinite',
        }}
      >
        <Gift className="h-[54px] w-[54px]" strokeWidth={2} />
      </button>
    </div>
  )
}

/** Gerbe du coffre ouvert (rayons, halo, étincelles) autour de `children`. */
export function ChestBurst({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative mt-1.5 grid min-h-[150px] place-items-center',
        className,
      )}
    >
      <Rays visible />
      <Halo />
      {SPARKS.map((s) => (
        <i
          key={`${s.tx}-${s.ty}`}
          aria-hidden
          className={cn('absolute h-2 w-2 rounded-[2px] opacity-0', s.color)}
          style={
            {
              '--tx': s.tx,
              '--ty': s.ty,
              animation: `claimParticle 1s ease-out ${s.delay}ms forwards`,
            } as CSSProperties
          }
        />
      ))}
      <div className="relative">{children}</div>
    </div>
  )
}

/** Tuile de gain : entre en rebond et compte jusqu'au montant. `toneClass`
 *  porte bordure, fond et encre (teintes de monnaie de la barre du haut). */
export function ChestRewardTile({
  icon: Icon,
  amount,
  label,
  toneClass,
  index = 0,
  className,
}: {
  icon: LucideIcon
  amount: number
  label: string
  toneClass: string
  index?: number
  className?: string
}) {
  const delay = 150 + index * 120
  const value = useCountUp(amount, delay)
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[18px] border px-2 pt-4 pb-3.5 opacity-0',
        toneClass,
        className,
      )}
      style={{
        animation: `returnChestTileIn 500ms cubic-bezier(.2,1.3,.4,1) ${delay}ms forwards`,
      }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-current/20 bg-card">
        <Icon className="h-6 w-6" />
      </span>
      <b className="font-display text-[28px] leading-none font-extrabold tabular-nums">
        +{formatNumber(value, currentLocale())}
      </b>
      <small className="text-[13px] font-semibold opacity-75">{label}</small>
    </div>
  )
}
