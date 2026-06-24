import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Crown,
  Lock,
  Star,
  Swords,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

import type {
  CampaignStage,
  StageStatus,
  SweepResult,
} from '../../api/campaign.api.ts'
import { ArcadeCard } from '../../components/shared/ArcadeCard.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupHeader,
  PopupTitle,
} from '../../components/ui/popup.tsx'
import {
  useCampaign,
  useSweepStage,
} from '../../queries/useCampaign.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'

export const Route = createFileRoute('/_authenticated/campaign')({
  component: CampaignPage,
})

function CampaignPage() {
  const navigate = useNavigate()
  const campaign = useCampaign()
  const team = useCombatTeam()
  const points = useCombatPoints()
  const sweep = useSweepStage()
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)
  const [sweepStageId, setSweepStageId] = useState<string | null>(null)

  const hasTeam = (team.data?.team.length ?? 0) >= 1
  const currentPC = points.data?.combatPoints ?? 0
  const battleCost = points.data?.battleCost ?? 1
  const sweepCost = points.data?.sweepCost ?? 1
  const sweepRuns = 3
  const canBattle = currentPC >= battleCost
  const canSweep = currentPC >= sweepCost * sweepRuns

  if (campaign.isLoading) {
    return (
      <PageShell>
        <p className="text-text-light">Chargement de la campagne…</p>
      </PageShell>
    )
  }
  if (campaign.isError) {
    return (
      <PageShell>
        <p className="text-rose-400">Erreur de chargement de la campagne.</p>
      </PageShell>
    )
  }
  const data = campaign.data
  if (!data) { return null }

  const handleBattle = (stageId: string) => {
    navigate({ to: '/battle/$stageId', params: { stageId } })
  }

  const handleSweep = (stageId: string, runs: number) => {
    setSweepStageId(stageId)
    sweep.mutate(
      { stageId, runs },
      {
        onSuccess: (data) => {
          setSweepResult(data)
        },
      },
    )
  }

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Campagne' },
        ]}
        title="Campagne"
        subtitle="Progresse à travers les chapitres pour débloquer drops et puissance"
      />

      {!hasTeam && !team.isLoading && (
        <ArcadeCard className="mt-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <Swords className="h-8 w-8 shrink-0 text-text-light/40" />
            <div className="flex-1">
              <p className="font-display text-base font-bold text-text">
                Configure ton équipe avant de combattre
              </p>
              <p className="text-sm text-text-light">
                Sélectionne jusqu'à 3 cartes dans la page Combat. Sans
                équipe, le combat échoue.
              </p>
            </div>
            <Link to="/combat">
              <Button>Configurer mon équipe</Button>
            </Link>
          </div>
        </ArcadeCard>
      )}

      <div className="mt-6 space-y-6">
        {data.chapters.map((chapter) => (
          <ArcadeCard key={chapter.chapter}>
            <h2 className="mb-4 font-display text-xl font-bold text-text">
              Chapitre {chapter.chapter}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {chapter.stages.map((stage) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  onBattle={() => handleBattle(stage.id)}
                  onSweep={() => handleSweep(stage.id, sweepRuns)}
                  sweepPending={
                    sweep.isPending && sweepStageId === stage.id
                  }
                  canBattle={canBattle && hasTeam}
                  canSweep={canSweep && hasTeam}
                  battleCost={battleCost}
                  sweepCost={sweepCost * sweepRuns}
                />
              ))}
            </div>
          </ArcadeCard>
        ))}
      </div>

      {/* Sweep result popup */}
      {sweepResult && (
        <Popup
          open
          onOpenChange={(v) => {
            if (!v) { setSweepResult(null) }
          }}
        >
          <PopupContent>
            <PopupHeader>
              <PopupTitle icon={<Zap className="h-4 w-4 text-amber-400" />}>
                Sweep × {sweepResult.runs}
              </PopupTitle>
            </PopupHeader>
            <PopupBody>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center">
                  <Stat label="Or" value={sweepResult.totalGold} />
                  <Stat label="Poussière" value={sweepResult.totalDust} />
                  <Stat label="XP" value={sweepResult.totalXp} />
                </div>
                {sweepResult.equipmentDrops.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-widest text-text-light/60">
                      Équipement
                    </p>
                    <ul className="space-y-1">
                      {sweepResult.equipmentDrops.map((e, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral list
                        <li key={i} className="text-text-light">
                          ✨ {e.name}{' '}
                          <span className="text-xs text-text-light/50">
                            ({e.rarity})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {sweepResult.cardDrops.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-widest text-text-light/60">
                      Cartes
                    </p>
                    <ul className="space-y-1">
                      {sweepResult.cardDrops.map((c, i) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral list
                        <li key={i} className="text-text-light">
                          🎴 {c.name}{' '}
                          <span className="text-xs text-text-light/50">
                            ({c.rarity})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="pt-2 text-center">
                  <Button onClick={() => setSweepResult(null)}>OK</Button>
                </div>
              </div>
            </PopupBody>
          </PopupContent>
        </Popup>
      )}
    </PageShell>
  )
}

function StageCard({
  stage,
  onBattle,
  onSweep,
  sweepPending,
  canBattle,
  canSweep,
  battleCost,
  sweepCost,
}: {
  stage: CampaignStage
  onBattle: () => void
  onSweep: () => void
  sweepPending: boolean
  canBattle: boolean
  canSweep: boolean
  battleCost: number
  sweepCost: number
}) {
  const Icon = stage.isBoss ? Crown : stage.status === 'locked' ? Lock : Star
  const isLocked = stage.status === 'locked'
  const isCleared = stage.status === 'cleared'
  const battleDisabled = !canBattle
  const sweepDisabled = !canSweep || sweepPending

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isLocked
          ? 'border-border bg-muted/10 opacity-60'
          : stage.isBoss
            ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-700/5'
            : 'border-border bg-muted/20'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon
            className={`h-4 w-4 ${
              stage.isBoss
                ? 'text-amber-300'
                : isLocked
                  ? 'text-text-light/40'
                  : 'text-text-light'
            }`}
          />
          <p className="font-display font-bold text-text">{stage.label}</p>
        </div>
        <StatusBadge status={stage.status} />
      </div>

      {stage.isBoss && (
        <p className="mt-1 text-xs uppercase tracking-widest text-amber-300/70">
          Boss · 1v3
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!isLocked && (
          <Button
            size="sm"
            variant={isCleared ? 'outline' : 'default'}
            onClick={onBattle}
            className="flex-1 gap-1.5"
            disabled={battleDisabled}
            title={
              battleDisabled
                ? `Pas assez d'énergie (besoin de ${battleCost} PC)`
                : `Coût : ${battleCost} PC`
            }
          >
            <Swords className="h-3.5 w-3.5" />
            {isCleared ? 'Rejouer' : 'Combattre'}
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-black/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
              <Zap className="h-2.5 w-2.5" />
              {battleCost}
            </span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
        {isCleared && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSweep}
            disabled={sweepDisabled}
            className="gap-1.5"
            title={
              !canSweep
                ? `Pas assez d'énergie (besoin de ${sweepCost} PC)`
                : `Farm rapide × 3 — coût ${sweepCost} PC`
            }
          >
            <Zap className="h-3.5 w-3.5" />
            ×3
            <span className="ml-0.5 rounded-full bg-black/10 px-1 py-0.5 text-[10px] font-bold tabular-nums">
              {sweepCost}
            </span>
          </Button>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: StageStatus }) {
  const config = {
    cleared: {
      label: 'Clear',
      className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    },
    current: {
      label: 'Actuel',
      className: 'border-sky-400/30 bg-sky-400/10 text-sky-300',
    },
    locked: {
      label: 'Verrou.',
      className: 'border-border bg-muted text-text-light/50',
    },
  }[status]
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.className}`}
    >
      {config.label}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-text-light/60">{label}</p>
      <p className="font-display text-base font-bold text-text tabular-nums">
        +{value.toLocaleString('fr-FR')}
      </p>
    </div>
  )
}
