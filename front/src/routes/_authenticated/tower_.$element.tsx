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
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState } from 'react'

import type { TeamUnit } from '../../api/combat.api.ts'
import type { TowerBattleResult, TowerFloorView } from '../../api/tower.api.ts'
import { BattleScene } from '../../components/battle/BattleScene.tsx'
import { MiniCard } from '../../components/battle/MiniCard.tsx'
import {
  RESULT_BADGE_LOSS,
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
  RewardTile,
} from '../../components/battle/resultKit.tsx'
import { TeamDock } from '../../components/battle/TeamDock.tsx'
import { SLOT_LABELS } from '../../components/collection/EquipmentSlotsPanel.tsx'
import { EquipmentDropReward } from '../../components/equipment/EquipmentDropCard.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { TcgCardFace } from '../../components/shared/tcg-card/TcgCardFace.tsx'
import { TeamEditorPopup } from '../../components/team/TeamEditorPopup.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../components/ui/popup.tsx'
import { SegmentedControl } from '../../components/ui/segmentedControl.tsx'
import type { CardElement } from '../../constants/card.constant.ts'
import { ELEMENT_LABELS } from '../../constants/card.constant.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import { useTower, useTowerBattle, useTowers } from '../../queries/useTower.ts'
import { computePower } from '../../utils/cardStats.ts'

export const Route = createFileRoute('/_authenticated/tower_/$element')({
  component: TowerFloorsPage,
})

function TowerFloorsPage() {
  // L'URL porte l'élément en minuscules ; l'API attend la valeur d'enum.
  const { element: elementParam } = Route.useParams()
  const element = elementParam.toUpperCase()
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
  // Étage en préparation : cliquer « Combattre » ouvre d'abord un aperçu
  // équipe / ennemis, comme la campagne, plutôt que de lancer le combat sec.
  const [prep, setPrep] = useState<TowerFloorView | null>(null)

  const userCardIds = (team.data?.team ?? []).map((u) => u.userCardId)
  const currentPC = combatPoints.data?.combatPoints ?? 0
  const battleCost = combatPoints.data?.battleCost ?? 0
  const hasTeam = userCardIds.length > 0
  const canBattle = currentPC >= battleCost && hasTeam && !battle.isPending

  const handleFight = (floor: number) => {
    setPrep(null)
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
  // Nom propre de la tour, renvoyé par le back. Le titre disait « Tour Feu »
  // pendant que ses étages s'appelaient « Tour de Braise — étage 1 ».
  const towerName =
    currentTower?.name ?? tower.data?.name ?? `Tour ${elementLabel}`
  const slotLabel = currentTower ? SLOT_LABELS[currentTower.slot] : null
  const subtitle = slotLabel
    ? `Permet d'obtenir des pièces « ${slotLabel} ». Plus l'étage est haut, meilleures sont les raretés.`
    : "Plus l'étage est haut, meilleures sont les raretés."

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Tours', to: '/tower' },
          { label: towerName },
        ]}
        title={towerName}
        subtitle={subtitle}
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
                navigate({
                  to: '/tower/$element',
                  params: { element: value.toLowerCase() },
                })
              }
              options={segmentOptions}
              wrap
            />
          )}

          <FloorList
            status={tower.status}
            floors={tower.data?.floors ?? []}
            canBattle={canBattle}
            isPending={battle.isPending}
            onFight={setPrep}
          />
        </>
      )}

      <TowerPrepPopup
        floor={prep}
        team={team.data?.team ?? []}
        currentPC={currentPC}
        battleCost={battleCost}
        isPending={battle.isPending}
        onFight={() => prep && handleFight(prep.index)}
        onEditTeam={() => {
          setPrep(null)
          setEditorOpen(true)
        }}
        onClose={() => setPrep(null)}
      />

      {/* Même bandeau d'équipe qu'en campagne : les deux se jouent avec la
          même équipe de combat. Il remplace le résumé d'équipe local, qui
          disait moins pour la même place. */}
      <TeamDock
        team={team.data?.team ?? []}
        onEdit={() => setEditorOpen(true)}
      />

      <TeamEditorPopup open={editorOpen} onOpenChange={setEditorOpen} />

      <BattleResultPopup
        result={sceneDone ? result : null}
        onClose={closeResult}
      />
    </PageShell>
  )
}

/**
 * Aperçu avant combat — même principe que la campagne : on voit son équipe
 * face aux ennemis de l'étage, avec un verdict de puissance, avant d'engager
 * son énergie. Remplace l'ancienne ligne « Puissance recommandée … · N
 * ennemis », qui donnait le chiffre sans le contexte.
 */
function TowerPrepPopup({
  floor,
  team,
  currentPC,
  battleCost,
  isPending,
  onFight,
  onEditTeam,
  onClose,
}: {
  floor: TowerFloorView | null
  team: TeamUnit[]
  currentPC: number
  battleCost: number
  isPending: boolean
  onFight: () => void
  onEditTeam: () => void
  onClose: () => void
}) {
  if (!floor) {
    return null
  }

  const totalPower = team.reduce((acc, u) => acc + computePower(u.stats), 0)
  const ratio =
    floor.recommendedPower === 0 ? 1 : totalPower / floor.recommendedPower
  const verdict =
    ratio >= 1.05 ? 'Avantage' : ratio >= 0.9 ? 'Équilibré' : 'Risqué'
  const verdictTone =
    ratio >= 1.05
      ? 'text-emerald-600'
      : ratio >= 0.9
        ? 'text-amber-600'
        : 'text-destructive'
  // Le libellé dit POURQUOI c'est bloqué : une équipe vide prime sur
  // l'énergie, sinon on annoncerait « énergie insuffisante » à tort.
  const label = team.length
    ? currentPC < battleCost
      ? 'Énergie insuffisante'
      : 'Combattre'
    : 'Équipe requise'
  const canFight = team.length > 0 && currentPC >= battleCost && !isPending

  return (
    <Popup open onOpenChange={(v) => !v && onClose()}>
      <PopupContent size="lg">
        <PopupHeader>
          <PopupTitle
            icon={<Swords className="h-4 w-4" />}
            subtitle={`Puissance recommandée ${floor.recommendedPower.toLocaleString('fr-FR')}`}
          >
            {floor.label}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-light">
                Votre équipe
              </span>
              <span
                className={`font-mono text-[11px] font-bold ${verdictTone}`}
              >
                {totalPower.toLocaleString('fr-FR')} · {verdict}
              </span>
            </div>
            {team.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {team.map((u) => (
                  <MiniCard
                    key={u.userCardId}
                    unit={u}
                    width="w-16"
                    showName={false}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-light">
                Aucune carte dans l'équipe de combat.
              </p>
            )}
          </div>

          <div>
            <span className="mb-2 block font-mono text-[11px] uppercase tracking-wider text-text-light">
              Adversaires
            </span>
            <div className="flex flex-wrap gap-2">
              {floor.enemies.map((e) => (
                <div key={e.id} className="relative aspect-[2/3] w-16">
                  <TcgCardFace
                    rarity={floor.isBoss ? 'LEGENDARY' : 'EPIC'}
                    name=""
                    setName=""
                    imageUrl={e.imageUrl}
                    variant="NORMAL"
                    isOwned
                    compact
                    showName={false}
                    element={(e.element ?? null) as CardElement | null}
                  />
                </div>
              ))}
            </div>
          </div>
        </PopupBody>
        <PopupFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onEditTeam}>
            Modifier l'équipe
          </Button>
          <Button onClick={onFight} disabled={!canFight} className="gap-2">
            <Swords className="h-4 w-4" />
            {label}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
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
  onFight: (floor: TowerFloorView) => void
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
          onFight={() => onFight(floor)}
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
              <EquipmentDropReward
                className="mt-4"
                drop={result.rewards.equipmentDrop}
              />
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
        </div>
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
