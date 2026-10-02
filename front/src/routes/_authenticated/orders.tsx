import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  EmptySlotRow,
  isReady,
  OrderRow,
} from '../../components/orders/OrderRow'
import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import type { OrderSlotView } from '../../constants/orders.constant'
import { useOrders } from '../../queries/useOrders'

export const Route = createFileRoute('/_authenticated/orders')({
  component: OrdersPage,
})

function OrdersPage() {
  const { t } = useTranslation('orders')
  const { data } = useOrders({ poll: true })

  // Prêtes → incomplètes → places libres (tri stable : l'ordre des places tient).
  const rank = (s: OrderSlotView) =>
    s.order ? (isReady(s.order, data?.deliveriesLeft ?? 0) ? 0 : 1) : 2
  const slots = [...(data?.slots ?? [])].sort((a, b) => rank(a) - rank(b))

  return (
    <PageShell>
      <PageHeader
        eyebrow={t('page.eyebrow')}
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        right={
          data && (
            <div className="flex items-center gap-3.5 rounded-[18px] border border-border bg-card py-3 pr-[18px] pl-3.5 text-left shadow-card">
              <span className="grid h-11 min-w-11 place-items-center rounded-xl border border-amber-soft bg-primary/10 px-1 font-display text-[34px] leading-none font-extrabold text-primary-dark">
                {data.deliveriesLeft}
              </span>
              <span className="text-sm leading-tight text-text-light">
                <b className="block text-[15px] text-text">
                  {t('page.quotaLabel', { count: data.deliveriesLeft })}
                </b>
                {t('page.quotaWhen')}
              </span>
            </div>
          )
        }
      />
      <div className="mt-3.5 flex flex-col gap-3.5">
        {slots.map((slot) =>
          slot.order ? (
            <OrderRow
              key={slot.slot}
              order={slot.order}
              deliveriesLeft={data?.deliveriesLeft ?? 0}
              freeDismissAvailable={data?.freeDismissAvailable ?? false}
            />
          ) : (
            <EmptySlotRow key={slot.slot} nextAt={slot.nextAt} />
          ),
        )}
      </div>
    </PageShell>
  )
}
