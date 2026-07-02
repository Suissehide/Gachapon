import {
  Coins,
  Heart,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Star,
  Sword,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import type { Card, CardVariant } from '../../constants/card.constant'
import { PASSIVE_LABELS } from '../../constants/passives.constant'
import { useAscendCard } from '../../queries/useAscendCard'
import { useLevelUpCard } from '../../queries/useLevelUpCard'
import { useAuthStore } from '../../stores/auth.store'
import {
  dustCostNextLevel,
  finalStat,
  goldCostNextLevel,
  isAtTopOfPalier,
  maxLevelInPalier,
} from '../../utils/cardStats'
import { Button } from '../ui/button'

const MAX_PALIER = 6

type Props = {
  userCardId: string
  card: Card
  variant: CardVariant
  quantity: number
  level: number
  palier: number
}

export function CombatPanel({
  userCardId,
  card,
  variant,
  quantity,
  level,
  palier,
}: Props) {
  const user = useAuthStore((s) => s.user)
  const fetchMe = useAuthStore((s) => s.fetchMe)

  const levelUp = useLevelUpCard()
  const ascend = useAscendCard()
  const [working, setWorking] = useState(false)

  const palierMax = maxLevelInPalier(palier)
  const atTop = isAtTopOfPalier(level, palier)
  const atMaxPalier = palier >= MAX_PALIER
  const goldCost = atTop ? 0 : goldCostNextLevel(level, card.rarity)
  const dustCost = atTop ? 0 : dustCostNextLevel(level, card.rarity)
  const goldOk = (user?.gold ?? 0) >= goldCost
  const dustOk = (user?.dust ?? 0) >= dustCost
  const canLevel = !atTop && goldOk && dustOk
  const canAscend = atTop && !atMaxPalier && quantity > 1

  const passive = card.passiveKey ? PASSIVE_LABELS[card.passiveKey] : null

  const hp = Math.round(finalStat(card.baseHp, level, variant, palier))
  const atk = Math.round(finalStat(card.baseAtk, level, variant, palier))
  const def = Math.round(finalStat(card.baseDef, level, variant, palier))
  const spd = Math.round(finalStat(card.baseSpd, level, variant, palier))

  const onLevelUp = async () => {
    setWorking(true)
    try {
      await levelUp.mutateAsync({ userCardId, targetLevel: level + 1 })
      await fetchMe()
    } finally {
      setWorking(false)
    }
  }

  const onAscend = async () => {
    setWorking(true)
    try {
      await ascend.mutateAsync({ userCardId })
      await fetchMe()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      {/* Combat header + level */}
      <div className="mt-[18px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
            Combat
          </span>
          <span className="whitespace-nowrap rounded-full border border-[#fcd34d] bg-[#fff7ed] px-[11px] py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-[#d97706]">
            PALIER {palier}
          </span>
        </div>
        <div className="mt-1.5 font-display text-[26px] font-extrabold leading-none -tracking-[0.01em] text-text">
          Niveau{' '}
          <span
            key={level}
            className="inline-block animate-[cardStatPop_0.55s_cubic-bezier(0.25,1.6,0.4,1)]"
          >
            {level}
          </span>{' '}
          <span className="font-bold text-[rgba(27,23,38,0.4)]">
            / {palierMax}
          </span>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-[18px] grid grid-cols-2 gap-2.5">
        <StatTile
          icon={<Heart className="h-4 w-4" />}
          label="PV"
          value={hp}
          accent="#ef4444"
        />
        <StatTile
          icon={<Sword className="h-4 w-4" />}
          label="ATQ"
          value={atk}
          accent="#f59e0b"
        />
        <StatTile
          icon={<Shield className="h-4 w-4" />}
          label="DEF"
          value={def}
          accent="#3b82f6"
        />
        <StatTile
          icon={<Zap className="h-4 w-4" />}
          label="VIT"
          value={spd}
          accent="#8b5cf6"
        />
      </div>

      {/* Level-up button */}
      {!atTop && (
        <LevelUpAction
          working={working}
          canLevel={canLevel}
          goldCost={goldCost}
          dustCost={dustCost}
          goldOk={goldOk}
          dustOk={dustOk}
          onLevelUp={onLevelUp}
        />
      )}

      {/* Ascend */}
      {atTop && !atMaxPalier && (
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={onAscend}
            disabled={!canAscend || working}
            className="h-auto w-full justify-center rounded-[14px] border-[#fcd34d] bg-[#fff7ed] px-[18px] py-[15px] text-[15.5px] font-bold text-[#d97706] hover:bg-[#fef3c7] hover:text-[#d97706] disabled:cursor-not-allowed disabled:border-[rgba(27,23,38,0.08)] disabled:bg-[#eceae4] disabled:text-[rgba(27,23,38,0.45)] disabled:opacity-100"
          >
            <Star className="h-[17px] w-[17px]" />
            {working ? 'Ascension…' : 'Ascensionner (1 doublon)'}
          </Button>
          {!canAscend && quantity <= 1 && (
            <div className="mt-2.5 flex items-center gap-[7px] px-0.5 text-[13px] font-semibold text-[#dc2626]">
              <Lock className="h-[13px] w-[13px] flex-shrink-0" />
              Doublon requis (tu n'en as pas)
            </div>
          )}
        </div>
      )}

      {atMaxPalier && atTop && (
        <div className="mt-4 rounded-[14px] border border-[#fcd34d] bg-[#fff7ed] px-4 py-3 text-center text-[13px] font-semibold text-[#d97706]">
          Niveau et palier maximaux atteints
        </div>
      )}

      {/* Passive */}
      {passive && (
        <div className="mt-4 rounded-[14px] border border-[rgba(27,23,38,0.06)] bg-surface-2 px-4 py-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
            <Sparkles className="h-3 w-3" /> Passif
          </p>
          <p className="mt-1 text-sm font-bold text-text">{passive.name}</p>
          <p className="mt-0.5 text-[12px] text-text-light">
            {passive.describe(palier)}
          </p>
        </div>
      )}
    </>
  )
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode
  label: string
  value: number
  accent: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border border-[rgba(27,23,38,0.06)] bg-surface-2 px-4 py-3.5">
      <span className="flex" style={{ color: accent }}>
        {icon}
      </span>
      <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-[rgba(27,23,38,0.5)]">
        {label}
      </span>
      <span className="ml-auto font-display text-[22px] font-extrabold tabular-nums text-text">
        {value.toLocaleString('fr-FR')}
      </span>
    </div>
  )
}

function CostItem({
  icon,
  value,
  ok,
}: {
  icon: ReactNode
  value: number
  ok: boolean
}) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center gap-1'
          : 'inline-flex items-center gap-1 font-extrabold text-[#dc2626]'
      }
    >
      {icon} {value}
    </span>
  )
}

function LevelUpAction({
  working,
  canLevel,
  goldCost,
  dustCost,
  goldOk,
  dustOk,
  onLevelUp,
}: {
  working: boolean
  canLevel: boolean
  goldCost: number
  dustCost: number
  goldOk: boolean
  dustOk: boolean
  onLevelUp: () => void
}) {
  const missing: string[] = []
  if (!goldOk) {
    missing.push("d'or")
  }
  if (!dustOk) {
    missing.push('de poussière')
  }
  // Click feedback — replays the press animation on every click (bumping the
  // key remounts the animated node so the keyframe restarts from 0).
  const [pressKey, setPressKey] = useState(0)
  const handleClick = () => {
    setPressKey((k) => k + 1)
    onLevelUp()
  }
  return (
    <div className="mt-4">
      <Button
        key={pressKey}
        onClick={handleClick}
        disabled={!canLevel || working}
        className={`h-auto w-full justify-between rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#f97316] px-[18px] py-[15px] text-[15.5px] font-bold text-white shadow-[0_12px_26px_-10px_rgba(245,158,11,0.55)] hover:-translate-y-[1px] hover:from-[#f59e0b] hover:to-[#f97316] hover:shadow-[0_12px_26px_-10px_rgba(245,158,11,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-[rgba(27,23,38,0.08)] disabled:bg-[#eceae4] disabled:bg-none disabled:text-[rgba(27,23,38,0.45)] disabled:opacity-100 disabled:shadow-none ${
          pressKey > 0 ? 'animate-[cardLevelUpPress_0.32s_ease]' : ''
        }`}
      >
        <span className="inline-flex items-center gap-[9px]">
          {working ? (
            <Loader2 className="h-[17px] w-[17px] animate-spin" />
          ) : (
            <TrendingUp className="h-[17px] w-[17px]" />
          )}
          {working ? 'En cours…' : 'Monter au niveau sup.'}
        </span>
        <span
          className={
            canLevel
              ? 'inline-flex items-center gap-2 rounded-full bg-white/20 px-[11px] py-[5px] font-mono text-xs'
              : 'inline-flex items-center gap-2 rounded-full bg-[rgba(27,23,38,0.06)] px-[11px] py-[5px] font-mono text-xs'
          }
        >
          <CostItem
            icon={<Coins className="h-3 w-3" />}
            value={goldCost}
            ok={goldOk}
          />
          <CostItem
            icon={<Sparkles className="h-3 w-3" />}
            value={dustCost}
            ok={dustOk}
          />
        </span>
      </Button>
      {!canLevel && missing.length > 0 && (
        <div className="mt-2.5 flex items-center gap-[7px] px-0.5 text-[13px] font-semibold text-[#dc2626]">
          <Lock className="h-[13px] w-[13px] flex-shrink-0" />
          Pas assez {missing.join(' et ')}
        </div>
      )}
    </div>
  )
}
