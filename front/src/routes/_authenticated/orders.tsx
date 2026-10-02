import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { OrderCard } from '../../components/orders/OrderCard'
import { PageHeader } from '../../components/shared/PageHeader'
import { PageShell } from '../../components/shared/PageShell'
import { useOrders } from '../../queries/useOrders'

export const Route = createFileRoute('/_authenticated/orders')({
  component: OrdersPage,
})

function OrdersPage() {
  const { t } = useTranslation('orders')
  const { data } = useOrders()

  return (
    <PageShell>
      <PageHeader
        eyebrow={t('page.eyebrow')}
        title={t('page.title')}
        subtitle={t('page.subtitle')}
        right={
          data && (
            <span className="text-sm font-semibold text-text-light">
              {t('page.deliveriesLeft', { count: data.deliveriesLeft })}
            </span>
          )
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        {data?.slots.map((slot) => (
          <OrderCard
            key={slot.slot}
            slot={slot}
            deliveriesLeft={data.deliveriesLeft}
            freeDismissAvailable={data.freeDismissAvailable}
          />
        ))}
      </div>
    </PageShell>
  )
}
