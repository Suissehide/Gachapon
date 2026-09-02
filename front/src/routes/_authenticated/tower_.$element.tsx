import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Coins,
  Crown,
  Lock,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'

import type { TowerBattleResult, TowerFloorView } from '../../api/tower.api.ts'
import { BattleScene } from '../../components/battle/BattleScene.tsx'
import {
  EquipmentDropReward,
  RESULT_BADGE_LOSS,
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
  RewardTile,
} from '../../components/battle/resultKit.tsx'
import { SLOT_LABELS } from '../../components/collection/EquipmentSlotsPanel.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { TeamEditorPopup } from '../../components/team/TeamEditorPopup.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Popup, PopupContent } from '../../components/ui/popup.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { CardElement } from '../../constants/card.constant.ts'
import { ELEMENT_LABELS } from '../../constants/card.constant.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import { useTower, useTowerBattle, useTowers } from '../../queries/useTower.ts'

export const Route = createFileRoute('/_authenticated/tower_/$element')({
  component: TowerFloorsPage,
})

function TowerFloorsPage() {
  const { element } = Route.useParams()
  const navigate = useNavigate()

  const towers = useTowers()
  const tower = useTower(element)
  const combatPoints = useCombatPoints()
  const team = useCombatTeam()
  const battle = useTowerBattle()

  const [editorOpen, setEditorOpen] = useState(false)
  const [result, setResult] = useState<TowerBattleResult | null>(null)
  // Le combat se joue d'abord en animation (comme la campagne), et seulement
  // ensuite la fenêtre de résultat s'ouvre. `sceneDone` sépare les deux temps.
  const [sceneDone, setSceneDone] = useState(false)

  const userCardIds = (team.data?.team ?? []).map((u) => u.userCardId)
  const currentPC = combatPoints.data?.combatPoints ?? 0
  const battleCost = combatPoints.data?.battleCost ?? 0
  const hasTeam = userCardIds.length > 0
  const canBattle = currentPC >= battleCost && hasTeam && !battle.isPending

  const handleFight = (floor: number) => {
    battle.mutate(
      { element, floor, userCardIds },
      {
        onSuccess: (res) => {
          setSceneDone(false)
          setResult(res)
        },
      },
    )
  }

  const closeResult = () => {
    setResult(null)
    setSceneDone(false)
  }

  // Éléments valides : dérivés de la liste des tours (`useTowers`), jamais
  // recopiés en dur — la source unique reste TOWER_ELEMENTS côté back.
  const segmentOptions = (towers.data?.towers ?? []).map((t) => ({
    value: t.element,
    label: ELEMENT_LABELS[t.element],
  }))

  // Slot alimenté par cette tour — vient de `useTowers()` (TowerSummary.slot),
  // jamais recopié : `useTower(element)` ne renvoie pas ce champ.
  const currentTower = towers.data?.towers.find((t) => t.element === element)
  const elementLabel = ELEMENT_LABELS[element as CardElement] ?? element
  const slotLabel = currentTower ? SLOT_LABELS[currentTower.slot] : null
  const subtitle = slotLabel
    ? `Alimente le slot « ${slotLabel} ». Un étage se franchit une fois, puis devient farmable indéfiniment.`
    : 'Un étage se franchit une fois, puis devient farmable indéfiniment.'

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Tours', to: '/tower' },
          { label: elementLabel },
        ]}
        title={`Tour ${elementLabel}`}
        subtitle={subtitle}
        right={
          combatPoints.data && (
            <span className="inline-flex items-center gap-1.5 font-mono text-sm text-text-light">
              <Zap className="h-4 w-4 text-violet-500" />
              {currentPC} / {combatPoints.data.maxStock}
            </span>
          )
        }
      />

      {result && !sceneDone ? (
        <BattleScene
          teamA={result.teamA}
          teamB={result.teamB}
          log={result.log}
          onComplete={() => setSceneDone(true)}
        />
      ) : (
        <>
          {segmentOptions.length > 0 && (
            <SegmentedControl
              value={element}
              onChange={(value) =>
                navigate({ to: '/tower/$element', params: { element: value } })
              }
              options={segmentOptions}
              wrap
            />
          )}

          <TeamSummary
            cardCount={userCardIds.length}
            onEdit={() => setEditorOpen(true)}
          />

          <FloorList
            status={tower.status}
            floors={tower.data?.floors ?? []}
            canBattle={canBattle}
            isPending={battle.isPending}
            onFight={handleFight}
          />
        </>
      )}

      <TeamEditorPopup open={editorOpen} onOpenChange={setEditorOpen} />

      <BattleResultPopup
        result={sceneDone ? result : null}
        onClose={closeResult}
      />
    </PageShell>
  )
}

function TeamSummary({
  cardCount,
  onEdit,
}: {
  cardCount: number
  onEdit: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm text-text-light">
        <Users className="h-4 w-4" />
        {cardCount > 0
          ? `Équipe : ${cardCount} carte${cardCount > 1 ? 's' : ''}`
          : 'Aucune équipe configurée'}
      </div>
      <Button variant="outline" size="sm" onClick={onEdit}>
        Modifier l'équipe
      </Button>
    </div>
  )
}

function FloorList({
  status,
  floors,
  canBattle,
  isPending,
  onFight,
}: {
  status: 'pending' | 'error' | 'success'
  floors: TowerFloorView[]
  canBattle: boolean
  isPending: boolean
  onFight: (floor: number) => void
}) {
  if (status === 'pending') {
    return <p className="mt-10 text-center text-text-light">Chargement…</p>
  }
  if (status === 'error') {
    return (
      <div className="mt-10 text-center text-destructive">
        <p>Impossible de charger cette tour.</p>
        <Link to="/tower" className="mt-2 inline-block text-sm underline">
          Retour aux tours
        </Link>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2.5">
      {floors.map((floor) => (
        <FloorRow
          key={floor.index}
          floor={floor}
          canBattle={canBattle}
          isPending={isPending}
          onFight={() => onFight(floor.index)}
        />
      ))}
    </div>
  )
}

function BattleResultPopup({
  result,
  onClose,
}: {
  result: TowerBattleResult | null
  onClose: () => void
}) {
  if (!result) {
    return null
  }
  return (
    <Popup open onOpenChange={(v) => !v && onClose()}>
      <PopupContent
        size="lg"
        className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
      >
        <Dialog.Title className="sr-only">Résultat du combat</Dialog.Title>
        <ResultPanel halo={result.won}>
          <ResultBadge
            className={result.won ? RESULT_BADGE_WIN : RESULT_BADGE_LOSS}
            icon={
              result.won ? (
                <Trophy className="h-8 w-8" />
              ) : (
                <Swords className="h-8 w-8" />
              )
            }
          />
          <h2 className="mt-4 font-display text-3xl font-bold text-text">
            {result.won ? 'Victoire !' : 'Défaite'}
          </h2>

          {result.rewards && (
            <>
              <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
                <RewardTile
                  icon={<Coins className="h-5 w-5" />}
                  label="Pièces"
                  value={result.rewards.gold}
                  tone="#f59e0b"
                />
                <RewardTile
                  icon={<Sparkles className="h-5 w-5" />}
                  label="Poussière"
                  value={result.rewards.dust}
                  tone="#38bdf8"
                />
                <RewardTile
                  icon={<Star className="h-5 w-5" />}
                  label="XP"
                  value={result.rewards.xp}
                  tone="#8b5cf6"
                />
              </div>
              <EquipmentDropReward drop={result.rewards.equipmentDrop} />
            </>
          )}

          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button onClick={onClose} className="gap-2">
              Continuer
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </ResultPanel>
      </PopupContent>
    </Popup>
  )
}

// L'étage 10 (isBoss) est le vrai spot de farm : les poids de rareté du §6
// design spec y concentrent EPIC/LEGENDARY. Les étages < 10, même farmables
// une fois franchis, ne servent qu'au passage — d'où le traitement visuel à
// part uniquement pour isBoss, jamais pour un simple étage "cleared".

function floorStateClasses(floor: TowerFloorView): string {
  if (floor.status === 'locked') {
    return 'border-dashed border-[rgba(27,23,38,0.12)] bg-[#f4f1ec] opacity-70 cursor-not-allowed'
  }
  if (floor.isBoss && floor.status === 'cleared') {
    return 'border-amber-400 bg-gradient-to-br from-[#fff7ed] to-white shadow-[0_2px_0_rgba(245,158,11,0.12),0_16px_32px_-18px_rgba(245,158,11,0.4)]'
  }
  if (floor.status === 'current') {
    return 'border-amber-300 bg-gradient-to-br from-[#fffaf0] to-white shadow-[0_2px_0_rgba(245,158,11,0.1),0_16px_32px_-18px_rgba(245,158,11,0.35)]'
  }
  return 'border-[rgba(27,23,38,0.08)] bg-[#fafaf7] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-14px_rgba(27,23,38,0.2)]'
}

function FloorStatusIcon({ floor }: { floor: TowerFloorView }) {
  if (floor.status === 'locked') {
    return <Lock className="h-4 w-4 shrink-0 text-text-light/40" />
  }
  if (floor.isBoss) {
    return <Crown className="h-4 w-4 shrink-0 text-amber-500" />
  }
  if (floor.status === 'current') {
    return <Star className="h-4 w-4 shrink-0 fill-current text-amber-500" />
  }
  return <Check className="h-4 w-4 shrink-0 text-emerald-600" />
}

function floorButtonLabel(floor: TowerFloorView): string {
  if (floor.status === 'current') {
    return 'Combattre'
  }
  if (floor.isBoss) {
    return 'Farmer'
  }
  return 'Refaire'
}

function FloorRow({
  floor,
  canBattle,
  isPending,
  onFight,
}: {
  floor: TowerFloorView
  canBattle: boolean
  isPending: boolean
  onFight: () => void
}) {
  const isLocked = floor.status === 'locked'

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border-[1.5px] p-4 transition-all ${floorStateClasses(floor)}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <FloorStatusIcon floor={floor} />
          <span
            className={`font-display text-[15px] font-extrabold ${
              isLocked ? 'text-text-light/50' : 'text-text'
            }`}
          >
            {floor.label}
          </span>
          {floor.isBoss && (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Spot de farm — hautes raretés
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-[11px] text-text-light/60">
          Puissance recommandée {floor.recommendedPower.toLocaleString('fr-FR')}
          {' · '}
          {floor.enemies.length} ennemi{floor.enemies.length > 1 ? 's' : ''}
        </p>
      </div>

      {!isLocked && (
        <Button
          size="sm"
          onClick={onFight}
          disabled={!canBattle || isPending}
          className="shrink-0 gap-1.5"
        >
          <Swords className="h-3.5 w-3.5" />
          {floorButtonLabel(floor)}
        </Button>
      )}
    </div>
  )
}
