import { Minus, Plus } from 'lucide-react'
import type { ReactNode } from 'react'

import type { CardElement, CardRarity } from '../../constants/card.constant.ts'
import { cn } from '../../libs/utils.ts'
import { Button } from '../ui/button.tsx'
import { CardDisplay } from './tcg-card/CardDisplay.tsx'

type Props = {
  card: {
    name: string
    imageUrl: string | null
    rarity: CardRarity
    element: CardElement | null
    setName: string
  }
  /** Exemplaires choisis de cette pile. */
  selected: number
  canAdd: boolean
  onAdd: () => void
  onRemove: () => void
  /** Textes déjà traduits : légende sous la carte et libellés a11y ±1. */
  labels: { spare: string; add: string; remove: string }
}

/** Grille des cartes sélectionnables (Alchimie, livraison de commande). */
export function SelectableCardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-3.5 gap-y-[18px]">
      {children}
    </div>
  )
}

/** Carte de doublon : clic = +1, anneau ambré et pastille quand choisie,
 *  stepper −/+ en dessous. */
export function SelectableDuplicateCard({
  card,
  selected,
  canAdd,
  onAdd,
  onRemove,
  labels,
}: Props) {
  return (
    <div className="flex flex-col gap-2.5">
      <Button
        type="button"
        variant="none"
        size="bare"
        aria-label={labels.add}
        aria-disabled={!canAdd}
        onClick={() => canAdd && onAdd()}
        className={cn(
          'relative block w-full rounded-[10px] text-left transition-[transform,box-shadow] duration-200 hover:bg-transparent',
          canAdd ? 'hover:-translate-y-[3px]' : 'cursor-default',
          selected > 0 &&
            'shadow-[0_0_0_3px_var(--background),0_0_0_6px_var(--primary),0_16px_30px_-12px_rgba(245,158,11,0.6)]',
        )}
      >
        <CardDisplay
          compact
          rarity={card.rarity}
          name={card.name}
          setName={card.setName}
          imageUrl={card.imageUrl}
          variant="NORMAL"
          element={card.element}
        />
        {selected > 0 && (
          <span className="absolute -top-2 -right-2 z-[6] grid h-8 min-w-8 place-items-center rounded-full bg-primary px-[9px] font-display text-[15px] font-extrabold text-foreground shadow-[0_0_0_3px_var(--card),0_6px_14px_-4px_rgba(245,158,11,0.7)]">
            {selected}
          </span>
        )}
      </Button>

      <div className="flex items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[13px] text-text-light">
          {labels.spare}
        </span>
        <div className="flex items-center gap-0.5 rounded-[11px] border border-border bg-surface-2 p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            disabled={selected === 0}
            aria-label={labels.remove}
            onClick={onRemove}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <b
            className={cn(
              'min-w-5 text-center font-display text-[15px] tabular-nums',
              selected > 0 && 'text-primary-dark',
            )}
          >
            {selected}
          </b>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="h-7 w-7"
            disabled={!canAdd}
            aria-label={labels.add}
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
