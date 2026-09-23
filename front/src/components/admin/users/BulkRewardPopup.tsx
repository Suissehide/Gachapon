import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { BulkRewardBody } from '../../../api/admin-rewards.api.ts'
import { TOAST_SEVERITY } from '../../../constants/ui.constant.ts'
import { useAppForm } from '../../../hooks/formConfig.tsx'
import { useToast } from '../../../hooks/useToast.ts'
import i18n from '../../../i18n/index.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { useAdminBulkReward } from '../../../queries/useAdminBulkReward.ts'
import { Badge } from '../../ui/badge.tsx'
import { Button } from '../../ui/button.tsx'
import { Checkbox } from '../../ui/input.tsx'
import { Label } from '../../ui/label.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../ui/popup.tsx'

// Radix Select interdit une value vide sur un Item — on utilise un sentinel
const NO_RARITY = 'NONE'

const RARITY_OPTIONS = [
  { value: NO_RARITY, label: i18n.t('admin:users.bulkReward.noRarityOption') },
  ...Object.entries(RARITY_LABEL_FR).map(([value, label]) => ({
    value,
    label,
  })),
]

type RewardFormValues = {
  tokens: number | undefined
  dust: number | undefined
  xp: number | undefined
  gold: number | undefined
  cardRarity: string
  labelFr: string
  labelEn: string
}

function isRewardEmpty(value: RewardFormValues): boolean {
  return (
    (value.tokens == null || value.tokens === 0) &&
    (value.dust == null || value.dust === 0) &&
    (value.xp == null || value.xp === 0) &&
    (value.gold == null || value.gold === 0) &&
    (!value.cardRarity || value.cardRarity === NO_RARITY)
  )
}

function buildReward(value: RewardFormValues): BulkRewardBody['reward'] {
  const reward: BulkRewardBody['reward'] = {}
  if (value.tokens != null) {
    reward.tokens = value.tokens
  }
  if (value.dust != null) {
    reward.dust = value.dust
  }
  if (value.xp != null) {
    reward.xp = value.xp
  }
  if (value.gold != null) {
    reward.gold = value.gold
  }
  if (value.cardRarity && value.cardRarity !== NO_RARITY) {
    reward.cardRarity = value.cardRarity
  }
  return reward
}

interface BulkRewardPopupProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  target: 'ALL' | string[]
  targetLabel: string
}

export function BulkRewardPopup({
  open,
  onClose,
  onSuccess,
  target,
  targetLabel,
}: BulkRewardPopupProps) {
  const [confirmed, setConfirmed] = useState(false)
  const bulkReward = useAdminBulkReward()
  const { toast } = useToast()
  const { t } = useTranslation('admin')
  const isAll = target === 'ALL'

  const form = useAppForm({
    defaultValues: {
      tokens: undefined as number | undefined,
      dust: undefined as number | undefined,
      xp: undefined as number | undefined,
      gold: undefined as number | undefined,
      cardRarity: NO_RARITY,
      labelFr: '',
      labelEn: '',
    },
    onSubmit: ({ value }) => {
      if (isRewardEmpty(value)) {
        toast({
          title: t('users.bulkReward.emptyToastTitle'),
          message: t('users.bulkReward.emptyToastMessage'),
          severity: TOAST_SEVERITY.ERROR,
        })
        return
      }
      bulkReward.mutate(
        {
          target: isAll ? 'ALL' : { userIds: target as string[] },
          reward: buildReward(value),
          labelFr: value.labelFr || undefined,
          labelEn: value.labelEn || undefined,
        },
        {
          onSuccess: () => {
            onClose()
            setConfirmed(false)
            form.reset()
            onSuccess?.()
          },
        },
      )
    },
  })

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      onClose()
      setConfirmed(false)
      form.reset()
    }
  }

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle>{t('users.sendRewardButton')}</PopupTitle>
        </PopupHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
        >
          <PopupBody className="space-y-4">
            <Badge variant="warning" className="w-full justify-center py-2">
              {targetLabel}
            </Badge>

            <div className="grid grid-cols-2 gap-3">
              <form.AppField name="tokens">
                {(field) => (
                  <field.Number label={t('users.bulkReward.tokensLabel')} />
                )}
              </form.AppField>
              <form.AppField name="dust">
                {(field) => (
                  <field.Number label={t('users.bulkReward.dustLabel')} />
                )}
              </form.AppField>
              <form.AppField name="xp">
                {(field) => (
                  <field.Number label={t('users.bulkReward.xpLabel')} />
                )}
              </form.AppField>
              <form.AppField name="gold">
                {(field) => (
                  <field.Number label={t('users.bulkReward.goldLabel')} />
                )}
              </form.AppField>
            </div>

            <form.AppField name="cardRarity">
              {(field) => (
                <field.Select
                  label={t('users.bulkReward.rarityLabel')}
                  options={RARITY_OPTIONS}
                />
              )}
            </form.AppField>

            <form.AppField name="labelFr">
              {(field) => (
                <field.Input label={t('users.bulkReward.labelFrField')} />
              )}
            </form.AppField>
            <form.AppField name="labelEn">
              {(field) => (
                <field.Input label={t('users.bulkReward.labelEnField')} />
              )}
            </form.AppField>

            {isAll && (
              <div className="flex cursor-pointer items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
                <Checkbox
                  id="bulk-confirm"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="bulk-confirm"
                  className="cursor-pointer text-sm leading-snug"
                >
                  <Trans
                    t={t}
                    i18nKey="users.bulkReward.confirmAllLabel"
                    components={{ strong: <strong /> }}
                  />
                </Label>
              </div>
            )}
          </PopupBody>

          <PopupFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('users.bulkReward.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={bulkReward.isPending || (isAll && !confirmed)}
            >
              {bulkReward.isPending
                ? t('users.bulkReward.sending')
                : t('users.bulkReward.send')}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
