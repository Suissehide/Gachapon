import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  Coins,
  Skull,
  Sparkles,
  Star,
  Swords,
  Ticket,
  Trophy,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'

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
import { isApiError } from '../../../libs/httpErrorHandler.ts'
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

/**
 * Écran plein-page tant que le raid n'est pas chargé, ou message convivial
 * si le joueur n'a pas (ou plus) accès à cette équipe — renvoie `null` une
 * fois les données prêtes pour laisser la page normale s'afficher.
 */
function RaidGate({
  raid,
  id,
}: {
  raid: ReturnType<typeof useRaid>
  id: string
}) {
  if (raid.isPending) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (raid.isError || !raid.data) {
    return (
      <div className="flex min-h-[calc(100vh-var(--topbar-h))] flex-col items-center justify-center gap-3 text-center">
        <p className="text-text-light">
          {isApiError(raid.error)
            ? raid.error.message
            : 'Impossible de charger ce raid.'}
        </p>
        <Link
          to="/team/$id"
          params={{ id }}
          className="text-sm text-primary underline"
        >
          Retour à l'équipe
        </Link>
      </div>
    )
  }
  return null
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

  // La boîte de préparation ne navigue plus depuis son propre `onClose` :
  // le bouton « Modifier » de BattlePrepModal appelle toujours `onClose`
  // juste avant `onEditTeam` (même geste pour « fermer avant d'ouvrir
  // l'éditeur » que pour un abandon volontaire), donc `onClose` ne peut pas
  // savoir tout seul lequel des deux c'est. On se contente d'y fermer la
  // boîte (état pur), et cet effet décide APRÈS coup, une fois le rendu
  // retombé avec l'état final de ce même clic (React 18 regroupe les deux
  // mises à jour dans le même commit), si personne n'a pris le relais
  // (éditeur ouvert, attaque en cours ou déjà lancée) — sinon seulement, on
  // quitte vers la page d'équipe.
  // biome-ignore lint/correctness/useExhaustiveDependencies: ne doit réagir qu'à une fermeture de prepOpen elle-même — avec result/inBattle en deps, la fermeture du popup de résultat (qui navigue déjà lui-même) redéclencherait l'effet et naviguerait une seconde fois
  useEffect(() => {
    if (prepOpen || editorOpen || inBattle || result || attack.isPending) {
      return
    }
    navigate({ to: '/team/$id', params: { id } })
  }, [prepOpen])

  if (raid.isPending || raid.isError || !raid.data) {
    return <RaidGate raid={raid} id={id} />
  }

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

      {raid.data && !inBattle && !result && (
        <Popup open={prepOpen} onOpenChange={setPrepOpen}>
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
              onClose={() => setPrepOpen(false)}
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
                <div key={t.pct} className="mb-2 flex w-full flex-col gap-2">
                  <div
                    className={`grid w-full gap-2.5 ${
                      t.reward.xp > 0 ? 'grid-cols-4' : 'grid-cols-3'
                    }`}
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
                    {t.reward.xp > 0 && (
                      <RewardTile
                        icon={<Star className="h-5 w-5" />}
                        label="XP"
                        value={t.reward.xp}
                        tone="#8b5cf6"
                      />
                    )}
                  </div>
                  {t.reward.cardRarity && (
                    <RewardPill
                      color="#ec4899"
                      label={`Carte ${RARITY_LABEL_FR[t.reward.cardRarity] ?? t.reward.cardRarity}`}
                      icon={Trophy}
                    />
                  )}
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
