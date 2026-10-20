import { Coins, RotateCcw, Skull, Sparkles, Ticket } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  WandererBattleResult,
  WandererLootView,
  WandererView,
} from '../../api/campaign.api.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import { cn } from '../../libs/utils.ts'
import { formatWandererCountdown } from '../../queries/useCampaign.ts'
import {
  CardDropReward,
  RESULT_BADGE_LOSS,
  ResultBadge,
  ResultPanel,
} from '../battle/resultKit.tsx'
import { Button } from '../ui/button.tsx'
import { Popup, PopupContent } from '../ui/popup.tsx'
import {
  CHEST_POP_MS,
  ChestBurst,
  ChestButton,
  ChestGlow,
  ChestRewardTile,
  chestEyebrowClass,
  chestTitleClass,
} from '../ui/rewardChest.tsx'

// Teintes des pastilles de monnaie de la barre du haut, par lot.
const CURRENCY_TILE = {
  GOLD: {
    icon: Coins,
    tone: 'border-currency-gold/30 bg-currency-gold/10 text-currency-gold-ink',
    label: 'loot.gold',
  },
  DUST: {
    icon: Sparkles,
    tone: 'border-currency-dust/30 bg-currency-dust/10 text-currency-dust-ink',
    label: 'loot.dust',
  },
  TOKENS: {
    icon: Ticket,
    tone: 'border-currency-token/30 bg-currency-token/10 text-currency-token-ink',
    label: 'loot.tokens',
  },
} as const

/**
 * Fin de combat contre le monstre errant. Défaite : mêmes boutons que la
 * défaite d'une étape. Victoire : même coffre que la popup « Bon retour ! ».
 * Le lot est déjà crédité par le serveur à la victoire ; le coffre ne fait
 * que le révéler.
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
  if (result.won && result.loot) {
    return (
      <WandererLoot
        loot={result.loot}
        name={wanderer?.name ?? ''}
        onDone={onBack}
      />
    )
  }
  return (
    <WandererDefeat wanderer={wanderer} onRetry={onRetry} onBack={onBack} />
  )
}

function WandererDefeat({
  wanderer,
  onRetry,
  onBack,
}: {
  wanderer: WandererView | null
  onRetry: () => void
  onBack: () => void
}) {
  const { t } = useTranslation(['wanderer', 'combat'])
  return (
    <Popup
      open
      onOpenChange={(open) => {
        if (!open) {
          onBack()
        }
      }}
    >
      <PopupContent
        size="lg"
        className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
      >
        <ResultPanel>
          <ResultBadge
            className={RESULT_BADGE_LOSS}
            icon={<Skull className="h-8 w-8" />}
          />
          <Dialog.Title className="mt-4 font-display text-3xl font-bold text-text">
            {t('wanderer:lose.title', { name: wanderer?.name ?? '' })}
          </Dialog.Title>
          {wanderer && (
            <p className="mt-2 max-w-sm text-sm text-text-light">
              {t('wanderer:lose.body', {
                stage: wanderer.stageLabel,
                time: formatWandererCountdown(
                  new Date(wanderer.expiresAt).getTime() - Date.now(),
                ),
              })}
            </p>
          )}
          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={onBack}>
              {t('combat:battle.defeat.back')}
            </Button>
            <Button variant="violet" onClick={onRetry} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {t('combat:battle.defeat.retry')}
            </Button>
          </div>
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}

function WandererLoot({
  loot,
  name,
  onDone,
}: {
  loot: WandererLootView
  name: string
  onDone: () => void
}) {
  const { t } = useTranslation('wanderer')
  const { toast } = useToast()
  const [popping, setPopping] = useState(false)
  const [opened, setOpened] = useState(false)
  const ctaRef = useRef<HTMLButtonElement>(null)

  // « Récupérer » remplace « Ouvrir le butin » : le focus doit le suivre.
  useEffect(() => {
    if (opened) {
      ctaRef.current?.focus()
    }
  }, [opened])

  const openChest = () => {
    if (popping) {
      return
    }
    setPopping(true)
    setTimeout(() => setOpened(true), CHEST_POP_MS)
  }

  const claim = () => {
    toast({ title: t('toast.claimed'), severity: TOAST_SEVERITY.SUCCESS })
    onDone()
  }

  return (
    <Popup
      open
      onOpenChange={(open) => {
        if (open) {
          return
        }
        // Fermer ne saute jamais la révélation : depuis le coffre, on
        // l'ouvre ; depuis le butin, c'est « Récupérer ».
        if (opened) {
          claim()
        } else {
          openChest()
        }
      }}
    >
      <PopupContent
        className="rounded-[28px] border-0 shadow-[0_40px_80px_-30px_rgba(27,23,38,0.55)]"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ctaRef.current?.focus()
        }}
      >
        <div className="relative px-7 pt-[30px] pb-[26px] text-center">
          <ChestGlow />
          {opened ? (
            <>
              <div className={chestEyebrowClass}>{t('loot.eyebrow')}</div>
              <Dialog.Title className={cn(chestTitleClass, 'mt-2 mb-1.5')}>
                {t('loot.title')}
              </Dialog.Title>
              <ChestBurst className="mb-[22px] py-4">
                {loot.kind === 'CARD' ? (
                  <CardDropReward drop={loot.card} className="w-[170px]" />
                ) : (
                  <ChestRewardTile
                    icon={CURRENCY_TILE[loot.kind].icon}
                    amount={loot.amount}
                    label={t(CURRENCY_TILE[loot.kind].label)}
                    toneClass={CURRENCY_TILE[loot.kind].tone}
                    className="w-[170px]"
                  />
                )}
              </ChestBurst>
              <Button
                ref={ctaRef}
                variant="violet"
                size="lg"
                className="relative w-full"
                onClick={claim}
              >
                {t('loot.claim')}
              </Button>
            </>
          ) : (
            <>
              <div className={chestEyebrowClass}>{t('victory.eyebrow')}</div>
              <Dialog.Title className={cn(chestTitleClass, 'mt-2 mb-1.5')}>
                {t('victory.title', { name })}
              </Dialog.Title>
              <ChestButton
                label={t('victory.open')}
                popping={popping}
                onOpen={openChest}
              />
              <Button
                ref={ctaRef}
                variant="violet"
                size="lg"
                className="relative w-full"
                onClick={openChest}
                disabled={popping}
              >
                {t('victory.open')}
              </Button>
            </>
          )}
        </div>
      </PopupContent>
    </Popup>
  )
}
