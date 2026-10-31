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
          <Button
            variant="none"
            size="bare"
            aria-label={t('gacha:page.chooseCapsule')}
            className="group/trigger flex shrink-0 items-center justify-start gap-2 rounded-none bg-card pl-4 pr-3 font-display text-text outline-none transition-colors duration-300 hover:bg-surface-2 focus-visible:bg-surface-2 disabled:cursor-default disabled:hover:bg-card"
          >
            <span className="inline-flex transition-transform duration-300 ease-out group-hover/trigger:scale-110">
              <CapsuleSwatch kind={kind} />
            </span>
            {t('gacha:page.pull')}
            <span className="ml-0.5 border-l border-border pl-2 text-text-light transition-colors duration-300 group-hover/trigger:text-text">
              <ChevronDown className="h-4 w-4 transition-transform duration-300 ease-out group-hover/trigger:translate-y-0.5" />
            </span>
          </Button>
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
          // Survol : la lumière monte par le haut du segment au lieu d'un voile
          // plat, la pastille de coût s'éclaircit et se soulève ; au clic,
          // le segment se tasse.
          className="group/seg relative h-full gap-1.5 rounded-none border-l border-white/25 px-4 text-white before:pointer-events-none before:absolute before:inset-0 before:bg-linear-to-b before:from-white/30 before:to-white/0 before:opacity-0 before:transition-opacity before:duration-300 hover:bg-transparent hover:text-white hover:before:opacity-100 active:scale-[0.97] disabled:before:hidden"
        >
          ×{count}
          <span className="inline-flex items-center gap-0.5 rounded bg-white/25 px-1.5 py-0.5 font-mono text-[12px] font-bold tabular-nums transition-[transform,background-color] duration-300 ease-out group-hover/seg:-translate-y-px group-hover/seg:bg-white/40 group-disabled/seg:translate-y-0 group-disabled/seg:bg-white/25">
            <CostIcon className="h-3 w-3" />
            {unitCost * count}
          </span>
        </Button>
      ))}
    </div>
  )
}
