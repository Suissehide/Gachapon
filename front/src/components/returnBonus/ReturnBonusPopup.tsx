import { Ticket, Zap } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { ReturnChestClaim } from '../../api/returnBonus.api.ts'
import { cn } from '../../libs/utils.ts'
import { useClaimReturnBonus } from '../../queries/useReturnBonus.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
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

/** Fermeture sans ouverture : vaut jusqu'au prochain chargement complet de la
 *  page. Au niveau du module pour survivre aux démontages de la mise en page
 *  authentifiée (guide, admin…) comme aux `fetchMe()` en cours de session. */
let dismissedThisPageLoad = false

export function ReturnBonusPopup() {
  const { t } = useTranslation('returnBonus')
  const chest = useAuthStore((s) => s.user?.returnChest ?? null)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const claim = useClaimReturnBonus()
  const [dismissed, setDismissedState] = useState(dismissedThisPageLoad)
  const setDismissed = (value: boolean) => {
    dismissedThisPageLoad = value
    setDismissedState(value)
  }
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
    const minDelay = new Promise((resolve) => setTimeout(resolve, CHEST_POP_MS))
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
          <ChestGlow />
          {claimed ? (
            <>
              <div className={chestEyebrowClass}>{t('eyebrowOpened')}</div>
              <Dialog.Title className={cn(chestTitleClass, 'mt-2 mb-1.5')}>
                {t('openedTitle')}
              </Dialog.Title>
              <ChestBurst className="h-[150px]">
                <div className="font-display text-[64px] leading-none font-extrabold tracking-[-0.04em] text-primary-dark">
                  ×{claimed.gained.cappedDays}
                </div>
              </ChestBurst>
              <p className="relative -mt-1.5 mb-[18px] text-[15.5px] text-text-light">
                {t('daysOfRewards', { count: claimed.gained.cappedDays })}
              </p>
              <div className="relative mt-1 mb-[22px] grid grid-cols-2 gap-2.5">
                <ChestRewardTile
                  icon={Ticket}
                  amount={claimed.gained.tokens}
                  label={t('tokens')}
                  toneClass="border-currency-token/30 bg-currency-token/10 text-currency-token-ink"
                  index={0}
                />
                <ChestRewardTile
                  icon={Zap}
                  amount={claimed.gained.energy}
                  label={t('energy')}
                  toneClass="border-currency-energy/25 bg-currency-energy/8 text-currency-energy-ink"
                  index={1}
                />
              </div>
              <Button
                ref={ctaRef}
                size="lg"
                className="relative w-full"
                onClick={finish}
              >
                {t('claim')}
              </Button>
            </>
          ) : (
            <>
              <div className={chestEyebrowClass}>
                {t('eyebrowAway', { count: chest?.days ?? 0 })}
              </div>
              <Dialog.Title className={cn(chestTitleClass, 'mt-2 mb-1.5')}>
                {t('title')}
              </Dialog.Title>
              <p className="relative text-[15.5px] leading-[1.45] text-text-light">
                {t('subtitle')}
              </p>
              <ChestButton
                label={t('open')}
                popping={popping}
                onOpen={openChest}
              />
              <Button
                ref={ctaRef}
                size="lg"
                className="relative w-full"
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
