import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Skull,
  Sparkles,
  Swords,
  Ticket,
  Trophy,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'

import type { RaidAttackResult, RaidView } from '../../../api/raid.api.ts'
import {
  BattlePrepModal,
  RewardPill,
} from '../../../components/battle/BattlePrepModal.tsx'
import { BattleScene } from '../../../components/battle/BattleScene.tsx'
import {
  RESULT_BADGE_TIMEOUT,
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
  RewardTile,
} from '../../../components/battle/resultKit.tsx'
import { TeamDock } from '../../../components/battle/TeamDock.tsx'
import { PageHeader } from '../../../components/shared/PageHeader.tsx'
import { PageShell } from '../../../components/shared/PageShell.tsx'
import { TeamEditorPopup } from '../../../components/team/TeamEditorPopup.tsx'
import { Button } from '../../../components/ui/button.tsx'
import { Popup, PopupContent } from '../../../components/ui/popup.tsx'
import { ELEMENT_LABELS } from '../../../constants/card.constant.ts'
import { RARITY_LABEL_FR } from '../../../libs/rarity.ts'
import { useCombatTeam } from '../../../queries/useCombatTeam.ts'
import { useRaid, useRaidAttack } from '../../../queries/useRaid.ts'
import { useTeam } from '../../../queries/useTeams.ts'

export const Route = createFileRoute('/_authenticated/team/$id_/raid')({
  component: RaidAttackPage,
})

/** Le libellé dit toujours POURQUOI c'est bloqué, comme en campagne et en tour. */
function getFightLabel(
  hasTeam: boolean,
  killed: boolean,
  remaining: number,
): string {
  if (!hasTeam) {
    return 'Équipe requise'
  }
  if (killed) {
    return 'Boss vaincu'
  }
  if (remaining === 0) {
    return "Plus d'attaque aujourd'hui"
  }
  return 'Attaquer'
}

function RaidAttackPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { data: team } = useTeam(id)
  const raid = useRaid(id)
  const combatTeam = useCombatTeam()
  const attack = useRaidAttack(id)

  const [prepOpen, setPrepOpen] = useState(true)
  const [editorOpen, setEditorOpen] = useState(false)
  const [result, setResult] = useState<RaidAttackResult | null>(null)
  const [sceneDone, setSceneDone] = useState(false)
  const inBattle = result !== null && !sceneDone

  const userCardIds = (combatTeam.data?.team ?? []).map((u) => u.userCardId)
  const hasTeam = userCardIds.length > 0
  const remaining = raid.data?.me.attacksRemainingToday ?? 0
  const killed = raid.data?.killedAt != null
  const canAttack = hasTeam && remaining > 0 && !killed && !attack.isPending

  const handleAttack = () => {
    setPrepOpen(false)
    attack.mutate(userCardIds, {
      onSuccess: (res) => {
        setSceneDone(false)
        setResult(res)
      },
      onError: () => setPrepOpen(true),
    })
  }

  const closeResult = (again: boolean) => {
    setResult(null)
    setSceneDone(false)
    if (again) {
      setPrepOpen(true)
    } else {
      navigate({ to: '/team/$id', params: { id } })
    }
  }

  const fightLabel = getFightLabel(hasTeam, killed, remaining)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipes', to: '/team' },
          { label: team?.name ?? 'Équipe', to: '/team/$id', params: { id } },
          { label: 'Raid' },
        ]}
        title={raid.data ? `Raid · ${raid.data.boss.name}` : 'Raid'}
        subtitle="Une bataille de 10 tours : tout ce que tu infliges est retiré de la barre commune."
        right={
          <Button asChild variant="outline" className="gap-2">
            <Link to="/team/$id" params={{ id }}>
              <ArrowLeft className="h-4 w-4" />
              Retour à l'équipe
            </Link>
          </Button>
        }
      />

      {inBattle ? (
        <BattleScene
          teamA={result.teamA}
          teamB={result.teamB}
          log={result.log}
          onComplete={() => setSceneDone(true)}
        />
      ) : (
        <TeamDock
          team={combatTeam.data?.team ?? []}
          onEdit={() => setEditorOpen(true)}
        />
      )}

      {raid.data && prepOpen && !inBattle && !result && (
        <Popup
          open
          onOpenChange={(v) =>
            !v && navigate({ to: '/team/$id', params: { id } })
          }
        >
          <PopupContent size="lg">
            <BattlePrepModal
              eyebrow={
                <>
                  Raid d'équipe · boss {ELEMENT_LABELS[raid.data.boss.element]}{' '}
                  · {remaining} attaque{remaining > 1 ? 's' : ''} restante
                  {remaining > 1 ? 's' : ''}
                </>
              }
              enemies={[
                {
                  id: 'B0',
                  imageUrl: raid.data.boss.imageUrl,
                  power: raid.data.boss.power,
                  element: raid.data.boss.element,
                },
              ]}
              isBoss
              recommendedPower={raid.data.boss.power}
              team={combatTeam.data?.team ?? []}
              currentPC={0}
              battleCost={0}
              hideEnergy
              rewards={<RaidRewardPreview raid={raid.data} />}
              fightLabel={fightLabel}
              canFight={canAttack}
              onFight={handleAttack}
              onEditTeam={() => {
                setPrepOpen(false)
                setEditorOpen(true)
              }}
              onClose={() => navigate({ to: '/team/$id', params: { id } })}
            />
          </PopupContent>
        </Popup>
      )}

      <TeamEditorPopup
        open={editorOpen}
        onOpenChange={(open) => {
          setEditorOpen(open)
          if (!open) {
            setPrepOpen(true)
          }
        }}
      />

      <RaidResultPopup
        result={sceneDone ? result : null}
        onClose={closeResult}
      />
    </PageShell>
  )
}

/** Les attaques sont gratuites : pas d'énergie affichée, seulement les paliers restants. */
function RaidRewardPreview({ raid }: { raid: RaidView }) {
  const next = raid.tiers.find((t) => !t.reached)
  return (
    <>
      <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
        <Sparkles className="h-3 w-3 text-amber-600" />
        Prochain palier
      </div>
      {next ? (
        <div className="flex flex-wrap gap-2">
          <RewardPill
            color="#ef4444"
            label={`${next.pct} % des PV`}
            icon={Skull}
          />
          <RewardPill
            color="#10b981"
            label={`${next.reward.tokens} Jetons`}
            icon={Ticket}
          />
          <RewardPill
            color="#f59e0b"
            label={`${next.reward.gold} Or`}
            icon={Coins}
          />
          <RewardPill
            color="#38bdf8"
            label={`${next.reward.dust} Poussière`}
            icon={Sparkles}
          />
          {next.reward.cardRarity && (
            <RewardPill
              color="#ec4899"
              label={`Carte ${RARITY_LABEL_FR[next.reward.cardRarity] ?? next.reward.cardRarity}`}
              icon={Trophy}
            />
          )}
        </div>
      ) : (
        <p className="text-sm text-text-light">
          Tous les paliers sont atteints.
        </p>
      )}
    </>
  )
}

function RaidResultPopup({
  result,
  onClose,
}: {
  result: RaidAttackResult | null
  onClose: (again: boolean) => void
}) {
  if (!result) {
    return null
  }
  const pctBefore = Math.round((result.hpBefore / result.maxHp) * 100)
  const pctAfter = Math.round((result.hpAfter / result.maxHp) * 100)
  return (
    <Popup open onOpenChange={(v) => !v && onClose(false)}>
      <PopupContent
        size="lg"
        className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
      >
        <Dialog.Title className="sr-only">Résultat de l'attaque</Dialog.Title>
        <ResultPanel halo={result.killed}>
          <ResultBadge
            className={result.killed ? RESULT_BADGE_WIN : RESULT_BADGE_TIMEOUT}
            icon={
              result.killed ? (
                <Trophy className="h-8 w-8" />
              ) : (
                <Swords className="h-8 w-8" />
              )
            }
          />
          <h2 className="mt-4 font-display text-3xl font-bold text-text">
            {result.killed
              ? 'Boss vaincu !'
              : `${result.damage.toLocaleString('fr-FR')} dégâts`}
          </h2>

          <div className="mt-5 w-full">
            <div className="mb-1 flex justify-between font-mono text-xs text-text-light">
              <span>{pctBefore} %</span>
              <span>{pctAfter} %</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border border-border bg-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500 transition-[width] duration-1000"
                style={{ width: `${pctAfter}%` }}
              />
            </div>
          </div>

          {result.newTiers.length > 0 && (
            <div className="mt-6 w-full">
              <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
                Palier{result.newTiers.length > 1 ? 's' : ''} franchi
                {result.newTiers.length > 1 ? 's' : ''} pour toute l'équipe
              </div>
              {result.newTiers.map((t) => (
                <div
                  key={t.pct}
                  className="mb-2 grid w-full grid-cols-3 gap-2.5"
                >
                  <RewardTile
                    icon={<Ticket className="h-5 w-5" />}
                    label={`${t.pct} % · Jetons`}
                    value={t.reward.tokens}
                    tone="#10b981"
                  />
                  <RewardTile
                    icon={<Coins className="h-5 w-5" />}
                    label="Pièces"
                    value={t.reward.gold}
                    tone="#f59e0b"
                  />
                  <RewardTile
                    icon={<Sparkles className="h-5 w-5" />}
                    label="Poussière"
                    value={t.reward.dust}
                    tone="#38bdf8"
                  />
                </div>
              ))}
              <p className="text-xs text-text-light">
                À réclamer dans tes Récompenses.
              </p>
            </div>
          )}

          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              onClick={() => onClose(false)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à l'équipe
            </Button>
            {!result.killed && result.attacksRemainingToday > 0 && (
              <Button onClick={() => onClose(true)} className="gap-2">
                Réattaquer ({result.attacksRemainingToday})
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}
