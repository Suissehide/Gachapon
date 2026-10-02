import dayjs from 'dayjs'
import { Clock, Coins, Sparkles, Ticket } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { OrderSlotView } from '../../constants/orders.constant.ts'
import { useDismissOrder } from '../../queries/useOrders.ts'
import { Button } from '../ui/button.tsx'
import { Card, CardContent } from '../ui/card.tsx'
import { DeliverPopup } from './DeliverPopup.tsx'

type Props = {
  slot: OrderSlotView
  deliveriesLeft: number
  freeDismissAvailable: boolean
}

export function OrderCard({
  slot,
  deliveriesLeft,
  freeDismissAvailable,
}: Props) {
  const { t } = useTranslation(['orders', 'common'])
  const dismiss = useDismissOrder()
  const [open, setOpen] = useState(false)
  const { order } = slot

  if (!order) {
    return (
      <Card className="flex min-h-64 items-center justify-center border-dashed">
        <CardContent className="flex flex-col items-center gap-2 text-center text-sm text-text-light">
          <Clock className="h-5 w-5" />
          {slot.nextAt
            ? t('orders:card.nextClient', {
                time: dayjs(slot.nextAt).fromNow(true),
              })
            : t('orders:card.closedForToday')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-3">
          {order.client.imageUrl && (
            <img
              src={order.client.imageUrl}
              alt={order.client.name}
              className="h-16 w-12 rounded-lg object-contain"
            />
          )}
          <p className="font-semibold text-text">
            {t('orders:card.clientWants', { name: order.client.name })}
          </p>
        </div>

        <ul className="space-y-1 text-sm text-text">
          {order.lines.map((line) => (
            <li
              key={`${line.rarity}-${line.element ?? ''}-${line.setId ?? ''}`}
            >
              {t('orders:card.line', {
                quantity: line.quantity,
                rarity: t(`common:rarity.${line.rarity.toLowerCase()}`),
              })}
              {line.element &&
                ` · ${t(`common:elements.${line.element.toLowerCase()}`)}`}
              {line.setName && ` · ${line.setName}`}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 text-sm text-text-light">
          <span className="font-semibold text-text">
            {t('orders:card.reward')}
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-primary" />
            {order.reward.dust}
          </span>
          <span className="flex items-center gap-1">
            <Coins className="h-4 w-4 text-primary" />
            {order.reward.gold}
          </span>
          {order.reward.tokens > 0 && (
            <span className="flex items-center gap-1">
              <Ticket className="h-4 w-4 text-primary" />
              {order.reward.tokens}
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap gap-2">
          <Button
            disabled={!order.deliverable || deliveriesLeft === 0}
            onClick={() => setOpen(true)}
          >
            {t('orders:card.deliver')}
          </Button>
          <Button
            variant="ghost"
            disabled={dismiss.isPending}
            onClick={() => dismiss.mutate(order.id)}
          >
            {freeDismissAvailable
              ? t('orders:card.dismissFree')
              : t('orders:card.dismiss')}
          </Button>
        </div>
        {!order.deliverable && (
          <p className="text-xs text-text-light">
            {t('orders:card.notDeliverable')}
          </p>
        )}
      </CardContent>
      {open && (
        <DeliverPopup order={order} open={open} onOpenChange={setOpen} />
      )}
    </Card>
  )
}
