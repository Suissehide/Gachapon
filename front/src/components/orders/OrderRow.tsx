import type { TFunction } from 'i18next'
import { Clock, Coins, Sparkles, Ticket, UserX } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type { CardRarity } from '../../constants/card.constant.ts'
import type {
  OrderLineView,
  OrderView,
} from '../../constants/orders.constant.ts'
import { cn } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import { useDeliverOrder, useDismissOrder } from '../../queries/useOrders.ts'
import { ConfirmPopup } from '../team/ConfirmPopup.tsx'
import { Button } from '../ui/button.tsx'
import { DeliverPopup } from './DeliverPopup.tsx'

// Littéraux complets : Tailwind ne voit pas les classes construites.
const RARITY_DOT: Record<CardRarity, string> = {
  COMMON: 'bg-rarity-common',
  UNCOMMON: 'bg-rarity-uncommon',
  RARE: 'bg-rarity-rare',
  EPIC: 'bg-rarity-epic',
  LEGENDARY: 'bg-rarity-legendary',
}

/** « 3 h », « 45 min », « 2 h 15 min » — arrondi à la minute supérieure. */
export function formatWait(t: TFunction, minutes: number) {
  const total = Math.max(1, Math.ceil(minutes))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) {
    return t('orders:duration.minutes', { m })
  }
  if (m === 0) {
    return t('orders:duration.hours', { h })
  }
  return t('orders:duration.hoursMinutes', { h, m })
}

const lineLabel = (t: TFunction, line: OrderLineView) =>
  [
    t(`common:rarity.${line.rarity.toLowerCase()}`),
    line.element && t(`common:elements.${line.element.toLowerCase()}`),
    line.setName,
  ]
    .filter(Boolean)
    .join(' · ')

const owned = (line: OrderLineView) =>
  Math.min(
    line.candidates.reduce((s, c) => s + c.available, 0),
    line.quantity,
  )

/** Pourquoi Livrer est grisé : quota, demande(s) incomplète(s), ou cartes
 *  partagées entre demandes que le choix automatique n'a pas su répartir. */
function blockedHint(t: TFunction, order: OrderView, deliveriesLeft: number) {
  if (deliveriesLeft === 0) {
    return t('orders:card.hintNoDeliveries')
  }
  const missing = order.lines.filter((l) => owned(l) < l.quantity)
  const [first] = missing
  if (missing.length === 1 && first) {
    return t('orders:card.hintMissing', {
      count: first.quantity - owned(first),
      label: lineLabel(t, first),
    })
  }
  if (missing.length > 1) {
    return t('orders:card.hintMissingMany', {
      count: missing.reduce((s, l) => s + l.quantity - owned(l), 0),
    })
  }
  // Lignes complètes une à une, mais une même carte peut nourrir plusieurs
  // lignes : compter chaque doublon une seule fois borne le vrai manque.
  const pool = new Map(
    order.lines.flatMap((l) =>
      l.candidates.map((c) => [c.userCardId, c.available] as const),
    ),
  )
  const short =
    order.lines.reduce((s, l) => s + l.quantity, 0) -
    [...pool.values()].reduce((s, n) => s + n, 0)
  if (short > 0) {
    return t('orders:card.hintMissingMany', { count: short })
  }
  return t('orders:card.hintChoose')
}

export const isReady = (order: OrderView, deliveriesLeft: number) =>
  order.deliverable && deliveriesLeft > 0

type Props = {
  order: OrderView
  deliveriesLeft: number
  freeDismissAvailable: boolean
}

export function OrderRow({
  order,
  deliveriesLeft,
  freeDismissAvailable,
}: Props) {
  const { t } = useTranslation(['orders', 'common'])
  const deliver = useDeliverOrder()
  const dismiss = useDismissOrder()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const [pickOpen, setPickOpen] = useState(false)
  const [dismissOpen, setDismissOpen] = useState(false)

  const ready = isReady(order, deliveriesLeft)
  const canPick =
    deliveriesLeft > 0 && order.lines.every((l) => l.candidates.length > 0)

  const hint = ready ? null : blockedHint(t, order, deliveriesLeft)

  const { dust, gold, tokens } = order.reward

  return (
    <article
      className={cn(
        'grid grid-cols-[84px_minmax(0,1fr)] items-center gap-[18px] rounded-[22px] border border-border bg-card py-5 pr-6 pl-5 shadow-card md:grid-cols-[112px_minmax(0,1fr)_auto] md:gap-7',
        ready &&
          'border-primary/50 bg-gradient-to-r from-primary/8 via-card to-card shadow-[0_2px_0_rgba(245,158,11,0.08),0_18px_36px_-20px_rgba(245,158,11,0.35)]',
      )}
    >
      <div className="grid h-[106px] w-[84px] place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-surface-3 to-track md:h-[140px] md:w-[112px]">
        {order.client.imageUrl ? (
          <img
            src={order.client.imageUrl}
            alt={order.client.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="font-display text-[44px] font-extrabold text-text/25">
            {order.client.name.charAt(0)}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-3.5">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-text">
            {order.client.name}
          </h2>
          <span className="text-[15px] text-text-light">
            {t('orders:card.lookingFor')}
          </span>
        </div>

        <ul className="flex flex-wrap gap-2">
          {order.lines.map((line) => {
            const have = owned(line)
            const ok = have >= line.quantity
            return (
              <li
                key={`${line.rarity}-${line.element ?? ''}-${line.setId ?? ''}`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 py-2 pr-3 pl-2.5 text-[15px] text-text"
              >
                <i
                  className={cn(
                    'h-2.5 w-2.5 shrink-0 rounded-[3px]',
                    RARITY_DOT[line.rarity],
                  )}
                />
                {lineLabel(t, line)}
                <span
                  className={cn(
                    'rounded-[7px] border px-[7px] py-0.5 font-mono text-[13px] font-bold',
                    ok
                      ? 'border-success/30 bg-success/10 text-success-ink'
                      : 'border-danger-ink/20 bg-destructive/8 text-danger-ink',
                  )}
                >
                  {have}/{line.quantity}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-text-light uppercase">
            {t('orders:card.reward')}
          </span>
          <Reward
            icon={<Sparkles className="h-5 w-5" />}
            value={dust}
            unit={t('common:currency.dust.singular')}
          />
          <Reward
            icon={<Coins className="h-5 w-5" />}
            value={gold}
            unit={t('common:currency.gold.singular')}
          />
          {tokens > 0 && (
            <Reward
              icon={<Ticket className="h-5 w-5" />}
              value={tokens}
              unit={t(
                tokens > 1
                  ? 'common:currency.tokens.plural'
                  : 'common:currency.tokens.singular',
              )}
            />
          )}
        </div>
      </div>

      <div className="col-span-full flex flex-col items-stretch gap-2.5 md:col-span-1 md:w-[210px]">
        <Button
          variant="amber"
          className="h-[52px] rounded-[14px] text-[17px]"
          disabled={!ready || !order.suggestedPicks || deliver.isPending}
          onClick={() =>
            order.suggestedPicks &&
            deliver.mutate({ orderId: order.id, picks: order.suggestedPicks })
          }
        >
          {t('orders:card.deliver')}
        </Button>
        {hint && (
          <p className="text-center text-[13px] leading-snug text-danger-ink">
            {hint}
          </p>
        )}
        {canPick && (
          <Button
            variant="link"
            className="h-auto p-0 text-primary-darker"
            onClick={() => setPickOpen(true)}
          >
            {t('orders:card.chooseCards')}
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-9 text-text-light hover:bg-foreground/5 hover:text-text"
          disabled={dismiss.isPending}
          onClick={() => setDismissOpen(true)}
        >
          {t('orders:card.dismiss')}
        </Button>
      </div>

      {pickOpen && (
        <DeliverPopup
          order={order}
          open={pickOpen}
          onOpenChange={setPickOpen}
        />
      )}
      <ConfirmPopup
        open={dismissOpen}
        onOpenChange={setDismissOpen}
        icon={<UserX className="h-4 w-4" />}
        title={t('orders:dismiss.title', { name: order.client.name })}
        description={
          freeDismissAvailable
            ? t('orders:dismiss.free', { name: order.client.name })
            : t('orders:dismiss.paid', {
                time: formatWait(t, economy.orders.cooldownMinutes),
              })
        }
        confirmLabel={t('orders:dismiss.confirm')}
        onConfirm={() => dismiss.mutate(order.id)}
      />
    </article>
  )
}

function Reward({
  icon,
  value,
  unit,
}: {
  icon: ReactNode
  value: number
  unit: string
}) {
  return (
    <span className="flex items-center gap-1.5 text-[17px] font-bold text-text">
      <span className="text-primary-dark">{icon}</span>
      {value}
      <small className="text-sm font-medium text-text-light">{unit}</small>
    </span>
  )
}

export function EmptySlotRow({ nextAt }: { nextAt: string | null }) {
  const { t } = useTranslation('orders')
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex items-center gap-3.5 rounded-[18px] border-[1.5px] border-dashed border-foreground/15 bg-card/50 px-[22px] py-4 text-[15px] text-text-light">
      <Clock className="h-5 w-5 shrink-0" />
      <span>
        {nextAt ? (
          <Trans
            t={t}
            i18nKey="empty.nextClient"
            values={{
              time: formatWait(t, (Date.parse(nextAt) - now) / 60_000),
            }}
            components={{
              b: (
                <b className="font-semibold whitespace-nowrap text-text tabular-nums" />
              ),
            }}
          />
        ) : (
          t('empty.closedForToday')
        )}
      </span>
      <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] font-bold tracking-[0.18em] text-text/35 uppercase">
        {t('empty.slot')}
      </span>
    </div>
  )
}
