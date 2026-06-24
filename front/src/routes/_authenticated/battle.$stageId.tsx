import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Coins, Sparkles, TrendingUp, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { BattleResult } from '../../api/campaign.api.ts'
import { BattleScene } from '../../components/battle/BattleScene.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Button } from '../../components/ui/button.tsx'
import { useAttackStage } from '../../queries/useCampaign.ts'

export const Route = createFileRoute('/_authenticated/battle/$stageId')({
  component: BattlePage,
})

function BattlePage() {
  const { stageId } = Route.useParams()
  const attack = useAttackStage()
  const [result, setResult] = useState<BattleResult | null>(null)
  const [sceneDone, setSceneDone] = useState(false)
  const hasFiredRef = useRef(false)

  useEffect(() => {
    if (hasFiredRef.current) {
      return
    }
    hasFiredRef.current = true
    attack.mutate(stageId, {
      onSuccess: (data) => setResult(data),
    })
  }, [stageId, attack])

  return (
    <PageShell>
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/campaign"
          className="flex items-center gap-1 text-sm text-text-light hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> Campagne
        </Link>
      </div>

      {attack.isPending && !result && (
        <div className="rounded-2xl border border-border bg-muted/20 p-12 text-center">
          <p className="text-text-light">Combat en cours…</p>
        </div>
      )}

      {attack.isError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
          <p className="font-bold text-rose-300">Erreur</p>
          <p className="mt-1 text-sm text-text-light">
            {String(attack.error)}
          </p>
          <Link to="/campaign">
            <Button variant="outline" className="mt-3">
              Retour
            </Button>
          </Link>
        </div>
      )}

      {result && (
        <>
          <BattleScene
            teamA={result.teamA}
            teamB={result.teamB}
            log={result.log}
            onComplete={() => setSceneDone(true)}
          />

          {sceneDone && (
            <div className="mt-6">
              {result.won ? (
                <RewardsPanel result={result} />
              ) : (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
                  <p className="font-bold text-rose-300">Défaite</p>
                  <p className="mt-1 text-sm text-text-light">
                    Lève ton équipe ou améliore tes cartes avant de réessayer.
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <Link to="/campaign">
                      <Button variant="outline">Retour</Button>
                    </Link>
                    <Button onClick={() => window.location.reload()}>
                      Réessayer
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </PageShell>
  )
}

function RewardsPanel({ result }: { result: BattleResult }) {
  const rewards = result.rewards
  if (!rewards) {
    return null
  }

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-700/5 p-6">
      <div className="flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-amber-400" />
        <p className="font-display text-lg font-bold text-emerald-300">
          {rewards.isFirstClear ? 'Premier clear !' : 'Victoire'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-background/40 p-3 text-center">
        <Stat icon={<Coins className="h-3 w-3" />} label="Or" value={rewards.gold} />
        <Stat icon={<Sparkles className="h-3 w-3" />} label="Poussière" value={rewards.dust} />
        <Stat icon={<TrendingUp className="h-3 w-3" />} label="XP" value={rewards.xp} />
      </div>

      {rewards.equipmentDrop && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-amber-300/70">
            Équipement
          </p>
          <p className="mt-1 font-bold text-amber-200">
            ✨ {rewards.equipmentDrop.name}{' '}
            <span className="text-xs text-amber-300/60">
              ({rewards.equipmentDrop.rarity})
            </span>
          </p>
        </div>
      )}

      {rewards.cardDrop && (
        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-sky-300/70">
            Carte
          </p>
          <p className="mt-1 font-bold text-sky-200">
            🎴 {rewards.cardDrop.name}{' '}
            <span className="text-xs text-sky-300/60">
              ({rewards.cardDrop.rarity}
              {rewards.cardDrop.wasDuplicate ? ' · doublon' : ''})
            </span>
          </p>
        </div>
      )}

      <div className="mt-4 flex justify-center gap-2">
        <Link to="/campaign">
          <Button variant="outline">Retour campagne</Button>
        </Link>
      </div>
    </div>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div>
      <p className="flex items-center justify-center gap-1 text-xs text-text-light/60">
        {icon} {label}
      </p>
      <p className="font-display text-base font-bold text-text tabular-nums">
        +{value.toLocaleString('fr-FR')}
      </p>
    </div>
  )
}
