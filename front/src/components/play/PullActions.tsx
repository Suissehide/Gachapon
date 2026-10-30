import { Link } from '@tanstack/react-router'
import { ChevronDown, ShoppingBag, Sparkles, Ticket } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '../../libs/utils.ts'
import type { CapsuleKind } from '../machine/capsule/capsuleConfig'
import { Button } from '../ui/button.tsx'
import {
  DropdownMenuCustomCheckboxItem,
  DropdownMenuCustomContent,
  DropdownMenuCustomItem,
} from '../ui/dropdownMenu.tsx'

const COUNTS = [1, 10] as const

// Pastille de capsule : moitié haute / moitié basse, comme la capsule 3D.
const SWATCH: Record<CapsuleKind, CSSProperties> = {
  classic: {
    background: 'linear-gradient(180deg, var(--card) 50%, var(--primary) 50%)',
    boxShadow: 'inset 0 0 0 1px var(--border-dark)',
  },
  astral: {
    background:
      'linear-gradient(180deg, var(--astral-day-sky), var(--astral-day-haze) 50%, var(--astral-night-violet) 50%, var(--astral-night-deep))',
    boxShadow: '0 0 6px var(--astral-night-violet)',
  },
}

function CapsuleSwatch({ kind }: { kind: CapsuleKind }) {
  return (
    <span
      aria-hidden
      className="h-4 w-4 shrink-0 rounded-full"
      style={SWATCH[kind]}
    />
  )
}

// Bouton groupé « Tirer » : le libellé ouvre la liste des capsules, les
// segments ×1 / ×10 tirent dans la capsule choisie. Même construction que
// `MultiRunActions` (BattlePrepModal).
export function PullActions({
  kind,
  onKindChange,
  tokens,
  astralStock,
  pullCost,
  disabled,
  onPull,
}: {
  kind: CapsuleKind
  onKindChange: (kind: CapsuleKind) => void
  tokens: number
  astralStock: number
  pullCost: number
  disabled: boolean
  onPull: (count: 1 | 10) => void
}) {
  const { t } = useTranslation('gacha')
  const astral = kind === 'astral'
  const funds = astral ? astralStock : tokens
  const unitCost = astral ? 1 : pullCost
  const CostIcon = astral ? Sparkles : Ticket

  return (
    <div
      className={cn(
        'flex h-12 items-stretch overflow-hidden rounded-xl border-[1.5px] text-[15px] font-bold text-white shadow-md',
        astral
          ? 'border-astral-night-violet bg-linear-to-br from-astral-night-violet to-astral-night-deep shadow-astral-night-violet/40'
          : 'border-primary bg-linear-to-br from-primary to-orange-500 shadow-primary/40',
      )}
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild disabled={disabled}>
          <button
            type="button"
            aria-label={t('gacha:page.chooseCapsule')}
            className="flex shrink-0 cursor-pointer items-center gap-2 bg-card pl-4 pr-3 font-display text-text outline-none focus-visible:bg-surface-2 disabled:cursor-default"
          >
            <CapsuleSwatch kind={kind} />
            {t('gacha:page.pull')}
            <span className="ml-0.5 border-l border-border pl-2 text-text-light">
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenuCustomContent align="start" className="w-60">
          <DropdownMenuCustomCheckboxItem
            checked={!astral}
            onCheckedChange={() => onKindChange('classic')}
            className="gap-2"
          >
            <CapsuleSwatch kind="classic" />
            {t('gacha:page.capsuleClassic')}
            <span className="ml-auto font-mono text-[11px] text-text-light">
              {t('gacha:page.tokenBalance', { count: tokens })}
            </span>
          </DropdownMenuCustomCheckboxItem>
          <DropdownMenuCustomCheckboxItem
            checked={astral}
            disabled={astralStock === 0}
            onCheckedChange={() => onKindChange('astral')}
            className="gap-2 data-disabled:pointer-events-none data-disabled:opacity-45"
          >
            <CapsuleSwatch kind="astral" />
            {t('gacha:page.capsuleAstral')}
            <span className="ml-auto font-mono text-[11px] text-text-light">
              ×{astralStock}
            </span>
          </DropdownMenuCustomCheckboxItem>
          {astralStock === 0 && (
            <DropdownMenuCustomItem
              asChild
              className="gap-2 py-1.5 pl-8 pr-2 text-sm"
            >
              <Link to="/shop">
                <ShoppingBag className="h-4 w-4" />
                {t('gacha:page.buyInShop')}
              </Link>
            </DropdownMenuCustomItem>
          )}
        </DropdownMenuCustomContent>
      </DropdownMenu.Root>
      {COUNTS.map((count) => (
        <Button
          key={count}
          variant="ghost"
          onClick={() => onPull(count)}
          disabled={disabled || funds < unitCost * count}
          className="h-full gap-1.5 rounded-none border-l border-white/25 px-4 text-white hover:bg-white/15 hover:text-white"
        >
          ×{count}
          <span className="inline-flex items-center gap-0.5 rounded bg-white/25 px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums">
            <CostIcon className="h-3 w-3" />
            {unitCost * count}
          </span>
        </Button>
      ))}
    </div>
  )
}
