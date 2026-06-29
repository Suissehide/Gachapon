import { Sparkles, Star, TrendingUp } from 'lucide-react'
import { useState } from 'react'

import type { Card, CardVariant } from '../../constants/card.constant'
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

const PASSIVE_LABELS: Record<
  string,
  { name: string; describe: (palier: number) => string }
> = {
  VAMPIRISM: {
    name: 'Vampirisme',
    describe: (p) => `Soigne ${10 + 5 * p} % des dégâts infligés`,
  },
  AEGIS: {
    name: 'Égide',
    describe: (p) => `${5 + 2 * p} % de chance d'ignorer une attaque`,
  },
  BANNER: {
    name: 'Bannière',
    describe: (p) => `+${6 + 3 * p} % d'ATQ à toute l'équipe`,
  },
  RIPOSTE: {
    name: 'Riposte',
    describe: (p) => `Renvoie ${8 + 4 * p} % des dégâts subis`,
  },
  REBIRTH: {
    name: 'Renaissance',
    describe: (p) => `Ressuscite une fois à ${20 + 5 * p} % de PV`,
  },
  EXECUTION: {
    name: 'Exécution',
    describe: (p) => `+${20 + 5 * p} % de dégâts sous 30 % de PV cible`,
  },
}

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
  const canLevel =
    !atTop && (user?.gold ?? 0) >= goldCost && (user?.dust ?? 0) >= dustCost
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
    <div className="border-t border-white/6">
      {/* Level + Palier */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Combat
          </p>
          <p className="font-display text-base font-bold text-white/90">
            Niveau {level}{' '}
            <span className="text-white/40">/ {palierMax}</span>
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Palier {palier}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/6 px-4 py-3 text-xs">
        <StatRow label="PV" value={hp} />
        <StatRow label="ATQ" value={atk} />
        <StatRow label="DEF" value={def} />
        <StatRow label="VIT" value={spd} />
      </div>

      {/* Passive */}
      {passive && (
        <div className="border-t border-white/6 px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            <Sparkles className="h-3 w-3" /> Passif
          </p>
          <p className="mt-1 font-semibold text-white/90">{passive.name}</p>
          <p className="mt-0.5 text-[11px] text-white/55">
            {passive.describe(palier)}
          </p>
        </div>
      )}

      {/* Level Up */}
      {!atTop && (
        <div className="border-t border-white/6 px-3 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={onLevelUp}
            disabled={!canLevel || working}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            {working
              ? 'En cours…'
              : `Monter (or ${goldCost.toLocaleString('fr-FR')} · pouss. ${dustCost.toLocaleString('fr-FR')})`}
          </Button>
        </div>
      )}

      {/* Ascend */}
      {atTop && !atMaxPalier && (
        <div className="border-t border-white/6 px-3 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-amber-200"
            onClick={onAscend}
            disabled={!canAscend || working}
          >
            <Star className="h-3.5 w-3.5" />
            {working ? 'Ascension…' : `Ascensionner (1 doublon)`}
          </Button>
          {!canAscend && quantity <= 1 && (
            <p className="mt-1 text-center text-[10px] text-white/40">
              Doublon requis (tu n'en as pas)
            </p>
          )}
        </div>
      )}

      {atMaxPalier && atTop && (
        <div className="border-t border-white/6 px-3 py-3 text-center text-[11px] text-amber-200/80">
          Niveau et palier maximaux atteints
        </div>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-white/6 bg-white/3 px-2 py-1">
      <span className="text-white/45">{label}</span>
      <span className="font-display text-sm font-bold text-white/90 tabular-nums">
        {value.toLocaleString('fr-FR')}
      </span>
    </div>
  )
}
