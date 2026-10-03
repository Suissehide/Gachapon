import { PackageCheck, WandSparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  type DeliveryPick,
  ORDER_RARITY_DOT,
  type OrderView,
  orderLineLabel,
} from '../../constants/orders.constant.ts'
import { cn } from '../../libs/utils.ts'
import { useDeliverOrder } from '../../queries/useOrders.ts'
import {
  SelectableCardGrid,
  SelectableDuplicateCard,
} from '../shared/SelectableDuplicateCard.tsx'
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

const fromPicks = (picks: DeliveryPick[] | null) =>
  Object.fromEntries(
    (picks ?? []).map((p) => [key(p.lineIndex, p.userCardId), p.amount]),
  )

/** Sélection pré-remplie par le serveur (suggestedPicks), modifiable carte par
 *  carte comme à l'Alchimie. Une carte présente dans plusieurs lignes ne peut
 *  pas dépasser son stock au total. Le serveur revalide tout. */
export function DeliverPopup({ order, open, onOpenChange }: Props) {
  const { t } = useTranslation(['orders', 'common'])
  const deliver = useDeliverOrder()
  const [rawAmounts, setAmounts] = useState<Record<string, number>>(() =>
    fromPicks(order.suggestedPicks),
  )

  // La popup reste montée dans la ligne, qui peut changer de commande (tri,
  // rafraîchissement) : on repart de la suggestion à chaque ouverture.
  // biome-ignore lint/correctness/useExhaustiveDependencies: on ne réinitialise qu'à l'ouverture ou au changement de commande, pas à chaque refetch
  useEffect(() => {
    if (open) {
      setAmounts(fromPicks(order.suggestedPicks))
    }
  }, [open, order.id])

  // Ne compte que les cartes encore candidates de leur ligne : une sélection
  // périmée ne peut ni gonfler un compteur ni partir au serveur.
  const amounts = Object.fromEntries(
    Object.entries(rawAmounts).filter(([k]) => {
      const [lineIndex, userCardId] = k.split(':')
      return order.lines[Number(lineIndex)]?.candidates.some(
        (c) => c.userCardId === userCardId,
      )
    }),
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
  const pickedTotal = Object.values(amounts).reduce((s, n) => s + n, 0)

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
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle
            icon={<PackageCheck className="h-4 w-4" />}
            subtitle={t('orders:deliver.subtitle')}
          >
            {t('orders:deliver.title')}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="space-y-7">
          {order.lines.map((line, lineIndex) => {
            const picked = pickedOnLine(lineIndex)
            return (
              <section
                key={`${line.rarity}-${line.element ?? ''}-${line.setId ?? ''}`}
                className="space-y-4"
              >
                <h3 className="flex items-center justify-between gap-3 font-display text-lg font-extrabold text-text">
                  <span className="flex items-center gap-2.5">
                    <i
                      className={cn(
                        'h-2.5 w-2.5 shrink-0 rounded-[3px]',
                        ORDER_RARITY_DOT[line.rarity],
                      )}
                    />
                    {t('orders:card.line', {
                      quantity: line.quantity,
                      rarity: orderLineLabel(t, line),
                    })}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-bold text-text-light',
                      picked === line.quantity && 'text-success-ink',
                    )}
                  >
                    {t('orders:deliver.lineProgress', {
                      picked,
                      quantity: line.quantity,
                    })}
                  </span>
                </h3>
                {line.candidates.length === 0 ? (
                  <p className="rounded-2xl border-[1.5px] border-dashed border-border-dark px-6 py-8 text-center text-sm text-text-light">
                    {t('orders:deliver.noCandidate')}
                  </p>
                ) : (
                  <SelectableCardGrid>
                    {line.candidates.map((c) => (
                      <SelectableDuplicateCard
                        key={c.userCardId}
                        card={c}
                        selected={amounts[key(lineIndex, c.userCardId)] ?? 0}
                        canAdd={
                          picked < line.quantity &&
                          usedByCard(c.userCardId) < c.available
                        }
                        onAdd={() => bump(lineIndex, c.userCardId, 1)}
                        onRemove={() => bump(lineIndex, c.userCardId, -1)}
                        labels={{
                          spare: t('orders:deliver.available', {
                            count: c.available,
                          }),
                          add: t('orders:deliver.add', { name: c.name }),
                          remove: t('orders:deliver.remove', { name: c.name }),
                        }}
                      />
                    ))}
                  </SelectableCardGrid>
                )}
              </section>
            )
          })}
        </PopupBody>
        <PopupFooter className="flex-wrap">
          {order.suggestedPicks && (
            <Button
              type="button"
              variant="amberSoft"
              onClick={() => setAmounts(fromPicks(order.suggestedPicks))}
            >
              <WandSparkles className="h-4 w-4" />
              {t('orders:deliver.auto')}
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            className="font-bold text-text-light hover:text-text"
            disabled={pickedTotal === 0}
            onClick={() => setAmounts({})}
          >
            {t('orders:deliver.clear')}
          </Button>
          <div className="flex-1" />
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
