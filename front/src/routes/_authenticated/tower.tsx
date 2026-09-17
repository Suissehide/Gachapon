import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Flame, Swords } from 'lucide-react'
import { useState } from 'react'

import type { CombatTeamView } from '../../api/combat.api.ts'
import type { TowerSummary } from '../../api/tower.api.ts'
import { ElementGuidePopup } from '../../components/battle/ElementGuidePopup.tsx'
import { MiniCard } from '../../components/battle/MiniCard.tsx'
import {
  SLOT_ICONS,
  SLOT_LABELS,
} from '../../components/collection/EquipmentSlotsPanel.tsx'
import { InfoButton } from '../../components/shared/InfoButton.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Card, CardTitle } from '../../components/ui/card.tsx'
import { ELEMENT_COLOR, ELEMENT_ICON } from '../../constants/card.constant.ts'
import { towerTeamKey } from '../../constants/combatTeam.constant.ts'
import { useAllCombatTeams } from '../../queries/useCombatTeam.ts'
import { useTowers } from '../../queries/useTower.ts'

export const Route = createFileRoute('/_authenticated/tower')({
  component: TowerListPage,
})

function TowerListPage() {
  const towers = useTowers()
  const teams = useAllCombatTeams()
  const [elementsOpen, setElementsOpen] = useState(false)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: 'Gachapon', to: '/play' }, { label: 'Tours' }]}
        title="Tours élémentaires"
        subtitle="Gravis les étages pour augmenter le taux de rareté des pièces obtenues."
        right={
          <InfoButton
            icon={Swords}
            onClick={() => setElementsOpen(true)}
            title="Comprendre les éléments"
          >
            Éléments
          </InfoButton>
        }
      />

      {towers.isLoading ? (
        <p className="mt-10 text-center text-text-light">Chargement…</p>
      ) : towers.isError ? (
        <p className="mt-10 text-center text-destructive">
          Impossible de charger les tours.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(towers.data?.towers ?? []).map((tower) => (
            <TowerCard
              key={tower.element}
              tower={tower}
              teamView={teams.data?.teams[towerTeamKey(tower.element)]}
              teamLoading={teams.isLoading}
              teamError={teams.isError}
            />
          ))}
        </div>
      )}

      {/* Éléments & priorité de ciblage */}
      <ElementGuidePopup open={elementsOpen} onOpenChange={setElementsOpen} />
    </PageShell>
  )
}

function TowerCard({
  tower,
  teamView,
  teamLoading,
  teamError,
}: {
  tower: TowerSummary
  teamView?: CombatTeamView
  teamLoading?: boolean
  teamError?: boolean
}) {
  const ElementIcon = ELEMENT_ICON[tower.element] ?? Flame
  const SlotIcon = SLOT_ICONS[tower.slot]
  const percent = Math.min((tower.highestFloor / tower.totalFloors) * 100, 100)

  return (
    <Link
      to="/tower/$element"
      // URL en minuscules : /tower/nature se lit mieux que /tower/NATURE.
      // La page remet en majuscules pour l'API, dont l'enum l'exige.
      params={{ element: tower.element.toLowerCase() }}
      className="block"
    >
      <Card className="cursor-pointer p-5 transition-transform hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(27,23,38,0.22)]">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: ELEMENT_COLOR[tower.element] }}
          >
            <ElementIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-lg">{tower.name}</CardTitle>
            <p className="flex items-center gap-1 text-xs text-text-light">
              <SlotIcon className="h-3.5 w-3.5" />
              Permet d'obtenir des pièces « {SLOT_LABELS[tower.slot]} »
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="font-mono text-sm text-text-light">
            Étage {tower.highestFloor} / {tower.totalFloors}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-text-light" />
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* L'équipe qui monte CETTE tour — d'un coup d'œil, on voit laquelle est
            contre-pickée et laquelle suit encore la campagne. */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {teamLoading ? (
            <div className="flex flex-wrap gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-[2/3] w-[72px] animate-pulse rounded-md bg-border"
                />
              ))}
            </div>
          ) : teamView && teamView.team.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {teamView.team.map((unit) => (
                <MiniCard
                  key={unit.userCardId}
                  unit={unit}
                  width="w-[72px]"
                  showName={false}
                />
              ))}
            </div>
          ) : teamError ? (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-destructive/70">
              Impossible de charger l'équipe
            </span>
          ) : (
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-light/50">
              Aucune équipe
            </span>
          )}
        </div>
      </Card>
    </Link>
  )
}
