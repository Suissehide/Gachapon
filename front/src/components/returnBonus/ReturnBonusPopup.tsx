import { Gift, Ticket, Zap } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ReturnChestClaim } from '../../api/returnBonus.api.ts'
import { cn } from '../../libs/utils.ts'
import { useClaimReturnBonus } from '../../queries/useReturnBonus.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'

/** Durée de l'éclatement du coffre avant d'afficher le butin (maquette). */
const POP_MS = 420
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
function useCountUp(target: number, delayMs: number, durationMs = 700) {
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

function RewardTile({
  kind,
  amount,
  index,
}: {
  kind: 'tokens' | 'energy'
  amount: number
  index: number
}) {
  const { t } = useTranslation('returnBonus')
  const value = useCountUp(amount, 150 + index * 120)
  const Icon = kind === 'tokens' ? Ticket : Zap
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[18px] border px-2 pt-4 pb-3.5 opacity-0',
        kind === 'tokens'
          ? 'border-currency-token/30 bg-currency-token/10 text-currency-token-ink'
          : 'border-currency-energy/25 bg-currency-energy/8 text-currency-energy-ink',
      )}
      style={{
        animation: `returnChestTileIn 500ms cubic-bezier(.2,1.3,.4,1) ${150 + index * 120}ms forwards`,
      }}
    >
      <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-current/20 bg-card">
        <Icon className="h-6 w-6" />
      </span>
      <b className="font-display text-[28px] leading-none font-extrabold tabular-nums">
        +{value}
      </b>
      <small className="text-[13px] font-semibold opacity-75">{t(kind)}</small>
    </div>
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

const eyebrowClass =
  'relative font-mono text-[11.5px] font-bold tracking-[0.24em] uppercase text-primary-dark'
const titleClass =
  'relative m-0 text-text font-display text-[34px] font-extrabold tracking-[-0.03em] leading-[1.05]'
const ctaClass =
  'relative h-14 w-full rounded-2xl text-[17px] font-extrabold text-text shadow-[0_3px_0_var(--primary-dark)] active:translate-y-0.5'

export function ReturnBonusPopup() {
  const { t } = useTranslation('returnBonus')
  const chest = useAuthStore((s) => s.user?.returnChest ?? null)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const claim = useClaimReturnBonus()
  // Fermer sans ouvrir : masqué jusqu'au prochain chargement complet de la
  // page, en mémoire seulement, pour qu'un fetchMe() en cours de session ne
  // rouvre pas la popup.
  const [dismissed, setDismissed] = useState(false)
  const [popping, setPopping] = useState(false)
  const [claimed, setClaimed] = useState<ReturnChestClaim | null>(null)
  const ctaRef = useRef<HTMLButtonElement>(null)

  const open = claimed !== null || (chest !== null && !dismissed)

  // Le bouton « Récupérer » remplace « Ouvrir le coffre » : le focus doit
  // le suivre, sinon il retombe sur le conteneur de la popup.
  useEffect(() => {
    if (claimed) {
      ctaRef.current?.focus()
    }
  }, [claimed])

  const finish = () => {
    setClaimed(null)
    setPopping(false)
    setDismissed(true)
    void fetchMe()
  }

  const openChest = () => {
    if (popping || claim.isPending) {
      return
    }
    setPopping(true)
    const minDelay = new Promise((resolve) => setTimeout(resolve, POP_MS))
    claim.mutate(undefined, {
      onSuccess: async (result) => {
        await minDelay
        setClaimed(result)
      },
      onError: () => {
        setPopping(false)
        setDismissed(true)
      },
    })
  }

  const onOpenChange = (next: boolean) => {
    if (next) {
      return
    }
    if (claimed) {
      finish()
    } else if (!popping) {
      setDismissed(true)
    }
  }

  if (!open) {
    return null
  }

  return (
    <Popup open onOpenChange={onOpenChange}>
      <PopupContent
        className="rounded-[28px] border-0 shadow-[0_40px_80px_-30px_rgba(27,23,38,0.55)]"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ctaRef.current?.focus()
        }}
      >
        <div className="relative px-7 pt-[30px] pb-[26px] text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_70%)]"
          />
          {claimed ? (
            <>
              <div className={eyebrowClass}>{t('eyebrowOpened')}</div>
              <Dialog.Title className={cn(titleClass, 'mt-2 mb-1.5')}>
                {t('openedTitle')}
              </Dialog.Title>
              <div className="relative mt-1.5 grid h-[150px] place-items-center">
                <Rays visible />
                <Halo />
                {SPARKS.map((s) => (
                  <i
                    key={`${s.tx}-${s.ty}`}
                    aria-hidden
                    className={cn(
                      'absolute h-2 w-2 rounded-[2px] opacity-0',
                      s.color,
                    )}
                    style={
                      {
                        '--tx': s.tx,
                        '--ty': s.ty,
                        animation: `claimParticle 1s ease-out ${s.delay}ms forwards`,
                      } as CSSProperties
                    }
                  />
                ))}
                <div className="relative font-display text-[64px] leading-none font-extrabold tracking-[-0.04em] text-primary-dark">
                  ×{claimed.gained.cappedDays}
                </div>
              </div>
              <p className="relative -mt-1.5 mb-[18px] text-[15.5px] text-text-light">
                {t('daysOfRewards', { count: claimed.gained.cappedDays })}
              </p>
              <div className="relative mt-1 mb-[22px] grid grid-cols-2 gap-2.5">
                <RewardTile
                  kind="tokens"
                  amount={claimed.gained.tokens}
                  index={0}
                />
                <RewardTile
                  kind="energy"
                  amount={claimed.gained.energy}
                  index={1}
                />
              </div>
              <Button ref={ctaRef} className={ctaClass} onClick={finish}>
                {t('claim')}
              </Button>
            </>
          ) : (
            <>
              <div className={eyebrowClass}>
                {t('eyebrowAway', { count: chest?.days ?? 0 })}
              </div>
              <Dialog.Title className={cn(titleClass, 'mt-2 mb-1.5')}>
                {t('title')}
              </Dialog.Title>
              <p className="relative text-[15.5px] leading-[1.45] text-text-light">
                {t('subtitle')}
              </p>
              <div className="relative mt-3.5 mb-[22px] grid h-[190px] place-items-center">
                <Rays visible={popping} />
                <Halo />
                <button
                  type="button"
                  aria-label={t('open')}
                  onClick={openChest}
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
              <Button
                ref={ctaRef}
                className={ctaClass}
                onClick={openChest}
                disabled={popping}
              >
                {t('open')}
              </Button>
            </>
          )}
        </div>
      </PopupContent>
    </Popup>
  )
}
