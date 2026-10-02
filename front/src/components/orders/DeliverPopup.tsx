import { Minus, PackageCheck, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  DeliveryPick,
  OrderView,
} from '../../constants/orders.constant.ts'
import { useDeliverOrder } from '../../queries/useOrders.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'

type Props = {
  order: OrderView
  open: boolean
  onOpenChange: (open: boolean) => void
}

const key = (lineIndex: number, userCardId: string) =>
  `${lineIndex}:${userCardId}`

/** Sélection pré-remplie par le serveur (suggestedPicks), modifiable carte par
 *  carte. Le serveur revalide tout : ce composant ne fait que compter. */
export function DeliverPopup({ order, open, onOpenChange }: Props) {
  const { t } = useTranslation(['orders', 'common'])
  const deliver = useDeliverOrder()
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (order.suggestedPicks ?? []).map((p) => [
        key(p.lineIndex, p.userCardId),
        p.amount,
      ]),
    ),
  )

  const usedByCard = (userCardId: string) =>
    Object.entries(amounts)
      .filter(([k]) => k.endsWith(`:${userCardId}`))
      .reduce((s, [, n]) => s + n, 0)
  const pickedOnLine = (lineIndex: number) =>
    Object.entries(amounts)
      .filter(([k]) => k.startsWith(`${lineIndex}:`))
      .reduce((s, [, n]) => s + n, 0)
  const complete = order.lines.every((l, i) => pickedOnLine(i) === l.quantity)

  const bump = (lineIndex: number, userCardId: string, delta: number) =>
    setAmounts((prev) => ({
      ...prev,
      [key(lineIndex, userCardId)]: Math.max(
        0,
        (prev[key(lineIndex, userCardId)] ?? 0) + delta,
      ),
    }))

  const submit = () => {
    const picks: DeliveryPick[] = Object.entries(amounts)
      .filter(([, amount]) => amount > 0)
      .map(([k, amount]) => {
        const [lineIndex, userCardId] = k.split(':')
        return {
          lineIndex: Number(lineIndex),
          userCardId: userCardId ?? '',
          amount,
        }
      })
    deliver.mutate(
      { orderId: order.id, picks },
      { onSuccess: () => onOpenChange(false) },
    )
  }

  return (
    <Popup open={open} onOpenChange={onOpenChange}>
      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle
            icon={<PackageCheck className="h-4 w-4" />}
            subtitle={t('orders:deliver.subtitle')}
          >
            {t('orders:deliver.title')}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="space-y-5">
          {order.lines.map((line, lineIndex) => (
            <section
              key={`${line.rarity}-${line.element ?? ''}-${line.setId ?? ''}`}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm font-semibold text-text">
                <span>
                  {t('orders:card.line', {
                    quantity: line.quantity,
                    rarity: t(`common:rarity.${line.rarity.toLowerCase()}`),
                  })}
                  {line.element &&
                    ` · ${t(`common:elements.${line.element.toLowerCase()}`)}`}
                  {line.setName && ` · ${line.setName}`}
                </span>
                <span
                  className={
                    pickedOnLine(lineIndex) === line.quantity
                      ? 'text-primary'
                      : 'text-text-light'
                  }
                >
                  {t('orders:deliver.lineProgress', {
                    picked: pickedOnLine(lineIndex),
                    quantity: line.quantity,
                  })}
                </span>
              </div>
              {line.candidates.length === 0 && (
                <p className="text-sm text-text-light">
                  {t('orders:deliver.noCandidate')}
                </p>
              )}
              {line.candidates.map((c) => {
                const mine = amounts[key(lineIndex, c.userCardId)] ?? 0
                const canAdd =
                  usedByCard(c.userCardId) < c.available &&
                  pickedOnLine(lineIndex) < line.quantity
                return (
                  <div
                    key={c.userCardId}
                    className="flex items-center gap-3 rounded-xl border border-border/40 bg-card p-2"
                  >
                    {c.imageUrl && (
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="h-12 w-9 rounded object-contain"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {c.name}
                      </p>
                      <p className="text-xs text-text-light">
                        {t('orders:deliver.available', { count: c.available })}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      disabled={mine === 0}
                      onClick={() => bump(lineIndex, c.userCardId, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {mine}
                    </span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      disabled={!canAdd}
                      onClick={() => bump(lineIndex, c.userCardId, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </section>
          ))}
        </PopupBody>
        <PopupFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('orders:deliver.cancel')}
          </Button>
          <Button disabled={!complete || deliver.isPending} onClick={submit}>
            {t('orders:deliver.confirm')}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
