import { Check, Coins, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { currentLocale } from '../../i18n/index.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import { Button } from './button.tsx'

const CURRENCY = {
  DUST: {
    icon: Sparkles,
    style: {
      '--cur': 'var(--currency-dust)',
      '--cur-ink': 'var(--currency-dust-ink)',
    },
  },
  GOLD: {
    icon: Coins,
    style: {
      '--cur': 'var(--currency-gold)',
      '--cur-ink': 'var(--currency-gold-ink)',
    },
  },
} as const

// Bouton d'achat dont le libellé est le prix, dans la couleur de sa monnaie.
// `buying` : spinner ; `bought` : ✓ « Acheté » ; `disabled` : solde
// insuffisant.
export function PriceButton({
  currency,
  amount,
  buying = false,
  bought = false,
  disabled = false,
  onClick,
  className,
}: {
  currency: 'DUST' | 'GOLD'
  amount: number
  buying?: boolean
  bought?: boolean
  disabled?: boolean
  onClick: () => void
  className?: string
}) {
  const { t } = useTranslation('shop')
  const { icon: Icon, style } = CURRENCY[currency]
  return (
    <Button
      variant="currency"
      size="price"
      style={style as CSSProperties}
      disabled={disabled || buying || bought}
      onClick={onClick}
      className={cn((buying || bought) && 'disabled:opacity-100', className)}
    >
      {buying ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : bought ? (
        <span className="flex items-center gap-1.5 animate-[shop-success-pop_0.4s_var(--ease-spring)]">
          <Check />
          {t('shop:staticCard.bought')}
        </span>
      ) : (
        <>
          <Icon />
          {formatNumber(amount, currentLocale())}
        </>
      )}
    </Button>
  )
}
