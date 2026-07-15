import { useState } from 'react'

import type { BulkRewardBody } from '../../../api/admin-rewards.api.ts'
import { useAppForm } from '../../../hooks/formConfig.tsx'
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

const RARITY_OPTIONS = [
  { value: '', label: '— Aucune —' },
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
  message: string
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
  if (value.cardRarity) {
    reward.cardRarity = value.cardRarity
  }
  return reward
}

interface BulkRewardPopupProps {
  open: boolean
  onClose: () => void
  target: 'ALL' | string[]
  targetLabel: string
}

export function BulkRewardPopup({
  open,
  onClose,
  target,
  targetLabel,
}: BulkRewardPopupProps) {
  const [confirmed, setConfirmed] = useState(false)
  const bulkReward = useAdminBulkReward()
  const isAll = target === 'ALL'

  const form = useAppForm({
    defaultValues: {
      tokens: undefined as number | undefined,
      dust: undefined as number | undefined,
      xp: undefined as number | undefined,
      gold: undefined as number | undefined,
      cardRarity: '',
      message: '',
    },
    onSubmit: ({ value }) => {
      bulkReward.mutate(
        {
          target: isAll ? 'ALL' : { userIds: target as string[] },
          reward: buildReward(value),
          message: value.message || undefined,
        },
        {
          onSuccess: () => {
            onClose()
            setConfirmed(false)
            form.reset()
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
          <PopupTitle>Envoyer une récompense</PopupTitle>
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
                {(field) => <field.Number label="Tokens" />}
              </form.AppField>
              <form.AppField name="dust">
                {(field) => <field.Number label="Dust" />}
              </form.AppField>
              <form.AppField name="xp">
                {(field) => <field.Number label="XP" />}
              </form.AppField>
              <form.AppField name="gold">
                {(field) => <field.Number label="Or" />}
              </form.AppField>
            </div>

            <form.AppField name="cardRarity">
              {(field) => (
                <field.Select label="Carte (rareté)" options={RARITY_OPTIONS} />
              )}
            </form.AppField>

            <form.AppField name="message">
              {(field) => <field.Input label="Message (optionnel)" />}
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
                  Je confirme l'envoi à <strong>tous les joueurs</strong>
                </Label>
              </div>
            )}
          </PopupBody>

          <PopupFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={bulkReward.isPending || (isAll && !confirmed)}
            >
              {bulkReward.isPending ? 'Envoi…' : 'Envoyer'}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
