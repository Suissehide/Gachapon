import { createFileRoute, Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowLeft,
  Coins,
  Sparkles,
  Swords,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { BattleResult } from '../../api/campaign.api.ts'
import { BattleScene } from '../../components/battle/BattleScene.tsx'
import { ArcadeCard } from '../../components/shared/ArcadeCard.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Button } from '../../components/ui/button.tsx'
import { isApiError } from '../../libs/httpErrorHandler.ts'
import { useAttackStage } from '../../queries/useCampaign.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'

export const Route = createFileRoute('/_authenticated/battle/$stageId')({
  component: BattlePage,
})

function BattlePage() {
  const { stageId } = Route.useParams()
  const team = useCombatTeam()
  const attack = useAttackStage()
  const [result, setResult] = useState<BattleResult | null>(null)
  const [sceneDone, setSceneDone] = useState(false)
  const hasFiredRef = useRef(false)

  const teamReady =
    !team.isLoading && (team.data?.team.length ?? 0) >= 1

  useEffect(() => {
    if (hasFiredRef.current) {
      return
    }
    // Only fire the attack once the team is loaded AND non-empty. Otherwise
    // the page renders the "no team" notice and never auto-attacks.
    if (team.isLoading) {
      return
    }
    if (!teamReady) {
      return
    }
    hasFiredRef.current = true
    attack.mutate(stageId, {
      onSuccess: (data) => setResult(data),
    })
  }, [stageId, attack, team.isLoading, teamReady])

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

      {team.isLoading && (
        <ArcadeCard className="text-center">
          <p className="text-text-light">Chargement…</p>
        </ArcadeCard>
      )}

      {!team.isLoading && !teamReady && <NoTeamNotice />}

      {teamReady && attack.isPending && !result && (
        <ArcadeCard className="py-12 text-center">
          <p className="font-display text-lg text-text">Combat en cours…</p>
          <p className="mt-1 text-sm text-text-light">
            Les forces s'affrontent.
          </p>
        </ArcadeCard>
      )}

      {teamReady && attack.isError && (
        <ArcadeCard className="text-center">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-rose-500" />
          <p className="font-bold text-rose-500">
            {isApiError(attack.error) ? attack.error.title : 'Erreur'}
          </p>
          <p className="mt-1 text-sm text-text-light">
            {isApiError(attack.error)
              ? attack.error.message
              : String(attack.error)}
          </p>
          <Link to="/campaign">
            <Button variant="outline" className="mt-3">
              Retour
            </Button>
          </Link>
        </ArcadeCard>
      )}

      {teamReady && result && (
        <ArcadeCard className="p-0 sm:p-0">
          <div className="p-4 sm:p-6">
            <BattleScene
              teamA={result.teamA}
              teamB={result.teamB}
              log={result.log}
              onComplete={() => setSceneDone(true)}
            />
          </div>

          {sceneDone && (
            <div className="border-t border-border/40 p-4 sm:p-6">
              {result.won ? (
                <RewardsPanel result={result} />
              ) : (
                <div className="text-center">
                  <p className="font-bold text-rose-500">Défaite</p>
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
        </ArcadeCard>
      )}
    </PageShell>
  )
}

function NoTeamNotice() {
  return (
    <ArcadeCard className="text-center">
      <Swords className="mx-auto mb-2 h-10 w-10 text-text-light/40" />
      <p className="font-display text-lg font-bold text-text">
        Aucune équipe déployée
      </p>
      <p className="mt-2 text-sm text-text-light">
        Avant de combattre, sélectionne jusqu'à 3 cartes dans la page
        Combat. Si tu n'as pas encore de cartes, fais d'abord quelques
        tirages sur la page Jouer.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link to="/combat">
          <Button>
            <Swords className="mr-2 h-4 w-4" />
            Configurer mon équipe
          </Button>
        </Link>
        <Link to="/play">
          <Button variant="outline">Faire un tirage</Button>
        </Link>
        <Link to="/campaign">
          <Button variant="outline">Retour campagne</Button>
        </Link>
      </div>
    </ArcadeCard>
  )
}

function RewardsPanel({ result }: { result: BattleResult }) {
  const rewards = result.rewards
  if (!rewards) {
    return null
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <p className="font-display text-lg font-bold text-emerald-600">
          {rewards.isFirstClear ? 'Premier clear !' : 'Victoire'}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center">
        <Stat icon={<Coins className="h-3 w-3" />} label="Or" value={rewards.gold} />
        <Stat icon={<Sparkles className="h-3 w-3" />} label="Poussière" value={rewards.dust} />
        <Stat icon={<TrendingUp className="h-3 w-3" />} label="XP" value={rewards.xp} />
      </div>

      {rewards.equipmentDrop && (
        <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-amber-700/70">
            Équipement
          </p>
          <p className="mt-1 font-bold text-amber-700">
            ✨ {rewards.equipmentDrop.name}{' '}
            <span className="text-xs text-amber-600/70">
              ({rewards.equipmentDrop.rarity})
            </span>
          </p>
        </div>
      )}

      {rewards.cardDrop && (
        <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-center">
          <p className="text-xs uppercase tracking-widest text-sky-700/70">
            Carte
          </p>
          <p className="mt-1 font-bold text-sky-700">
            🎴 {rewards.cardDrop.name}{' '}
            <span className="text-xs text-sky-600/70">
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
