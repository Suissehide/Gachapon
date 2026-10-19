import { Coins, Gift, Sparkles, Swords, Ticket } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  WandererBattleResult,
  WandererView,
} from '../../api/campaign.api.ts'
import placeholderImg from '../../assets/data/not-found.png'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'
import { CardDropReward } from '../battle/resultKit.tsx'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'

// Teintes des pastilles de monnaie de la barre du haut, par lot.
const CURRENCY_TILE = {
  GOLD: {
    icon: Coins,
    tile: 'border-currency-gold/30 bg-currency-gold/10 text-currency-gold-ink',
    label: 'loot.gold',
  },
  DUST: {
    icon: Sparkles,
    tile: 'border-currency-dust/30 bg-currency-dust/10 text-currency-dust-ink',
    label: 'loot.dust',
  },
  TOKENS: {
    icon: Ticket,
    tile: 'border-currency-token/30 bg-currency-token/10 text-currency-token-ink',
    label: 'loot.tokens',
  },
} as const

const CTA =
  'h-14 w-full rounded-2xl bg-currency-energy text-[17px] font-extrabold text-white shadow-[0_3px_0_var(--currency-energy-ink)] hover:bg-currency-energy/90 active:translate-y-0.5'

/**
 * Fin de combat contre le monstre errant : défaite, puis coffre et butin en
 * cas de victoire. Le lot est déjà crédité par le serveur à la victoire ; le
 * coffre et le butin ne font que le révéler.
 */
export function WandererResult({
  result,
  wanderer,
  onRetry,
  onBack,
}: {
  result: WandererBattleResult
  wanderer: WandererView | null
  onRetry: () => void
  onBack: () => void
}) {
  const { t } = useTranslation('wanderer')
  const { toast } = useToast()
  const [opened, setOpened] = useState(false)
  const loot = result.won ? result.loot : null
  const name = wanderer?.name ?? ''
  const image = wanderer?.imageUrl ?? placeholderImg

  const claim = () => {
    toast({ title: t('toast.claimed'), severity: TOAST_SEVERITY.SUCCESS })
    onBack()
  }

  let eyebrow: string
  let title: string
  let body: ReactNode
  if (!loot) {
    eyebrow = t('lose.eyebrow')
    title = t('lose.title', { name })
    body = (
      <>
        <div className="mx-auto mb-4 h-[150px] w-fit overflow-hidden rounded-2xl bg-text p-[5px] shadow-[0_0_0_2px_var(--currency-energy)] grayscale-[0.5]">
          <img
            src={image}
            alt=""
            className="h-full w-auto rounded-[11px] object-cover"
            style={{ aspectRatio: '300 / 420' }}
          />
        </div>
        {wanderer && (
          <p className="mb-[18px] text-[15px] leading-[1.45] text-pretty text-text-light">
            {t('lose.body', {
              stage: wanderer.stageLabel,
              time: formatWandererCountdown(
                new Date(wanderer.expiresAt).getTime() - Date.now(),
              ),
            })}
          </p>
        )}
        <Button className={CTA} onClick={onRetry}>
          <Swords className="h-[18px] w-[18px]" />
          {t('lose.retry')}
        </Button>
        <Button
          variant="ghost"
          className="mt-2 h-[42px] w-full text-[14.5px] font-bold text-text-light"
          onClick={onBack}
        >
          {t('lose.later')}
        </Button>
      </>
    )
  } else if (opened) {
    eyebrow = t('loot.eyebrow')
    title = t('loot.title')
    body = (
      <>
        {loot.kind === 'CARD' ? (
          <CardDropReward drop={loot.card} className="mb-[22px]" />
        ) : (
          <LootTile kind={loot.kind} amount={loot.amount} />
        )}
        <Button className={CTA} onClick={claim}>
          {t('loot.claim')}
        </Button>
      </>
    )
  } else {
    eyebrow = t('victory.eyebrow')
    title = t('victory.title', { name })
    body = (
      <>
        <button
          type="button"
          aria-label={t('victory.open')}
          onClick={() => setOpened(true)}
          className="mx-auto mt-1.5 mb-[26px] block h-[160px] cursor-pointer rounded-[14px] bg-text p-[5px] shadow-[0_0_0_2px_var(--currency-energy),0_20px_34px_-14px_color-mix(in_srgb,var(--currency-energy)_80%,transparent)]"
          style={{ aspectRatio: '300 / 420' }}
        >
          <span className="grid h-full w-full place-items-center rounded-[10px] bg-linear-160 from-currency-energy/60 via-currency-energy to-currency-energy-ink text-white">
            <Gift className="h-14 w-14" />
          </span>
        </button>
        <Button className={CTA} onClick={() => setOpened(true)}>
          {t('victory.open')}
        </Button>
      </>
    )
  }

  return (
    <Popup
      open
      onOpenChange={(open) => {
        if (open) {
          return
        }
        // Après une victoire, fermer ne saute jamais la révélation : depuis
        // le coffre, on l'ouvre ; depuis le butin, c'est « Récupérer ».
        if (!loot) {
          onBack()
        } else if (opened) {
          claim()
        } else {
          setOpened(true)
        }
      }}
    >
      <PopupContent className="rounded-[28px] border-0 bg-card text-center shadow-[0_40px_80px_-30px_color-mix(in_srgb,var(--currency-energy)_45%,transparent)]">
        <div className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto px-7 pt-[30px] pb-[26px]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[220px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_srgb,var(--currency-energy)_16%,transparent),transparent_70%)]"
          />
          <div className="relative">
            <div
              className={cn(
                'font-mono text-[11px] font-bold uppercase tracking-[0.22em]',
                loot ? 'text-currency-energy-ink' : 'text-danger-ink',
              )}
            >
              {eyebrow}
            </div>
            <Dialog.Title className="mt-1.5 mb-4 font-display text-[28px] font-extrabold tracking-[-0.02em] text-text">
              {title}
            </Dialog.Title>
            {body}
          </div>
        </div>
      </PopupContent>
    </Popup>
  )
}

function LootTile({
  kind,
  amount,
}: {
  kind: keyof typeof CURRENCY_TILE
  amount: number
}) {
  const { t } = useTranslation('wanderer')
  const { icon: Icon, tile, label } = CURRENCY_TILE[kind]
  return (
    <div
      className={cn(
        'mt-1 mb-[22px] flex flex-col items-center gap-2 rounded-[22px] border px-4 pt-6 pb-5',
        tile,
      )}
    >
      <span className="grid h-[60px] w-[60px] place-items-center rounded-[18px] border border-current/20 bg-card">
        <Icon className="h-[30px] w-[30px]" />
      </span>
      <b className="font-display text-[44px] leading-none font-extrabold">
        +{formatNumber(amount, currentLocale())}
      </b>
      <small className="text-[15px] font-semibold">{t(label)}</small>
    </div>
  )
}
