import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Flame } from 'lucide-react'
import { useState } from 'react'

import type { TowerSummary } from '../../api/tower.api.ts'
import { TeamDock } from '../../components/battle/TeamDock.tsx'
import {
  SLOT_ICONS,
  SLOT_LABELS,
} from '../../components/collection/EquipmentSlotsPanel.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { TeamEditorPopup } from '../../components/team/TeamEditorPopup.tsx'
import { Card, CardTitle } from '../../components/ui/card.tsx'
import {
  ELEMENT_COLOR,
  ELEMENT_ICON,
  ELEMENT_LABELS,
} from '../../constants/card.constant.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import { useTowers } from '../../queries/useTower.ts'

export const Route = createFileRoute('/_authenticated/tower')({
  component: TowerListPage,
})

function TowerListPage() {
  const towers = useTowers()
  const team = useCombatTeam()
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: 'Gachapon', to: '/play' }, { label: 'Tours' }]}
        title="Tours élémentaires"
        subtitle="Gravis les étages pour augmenter le taux de rareté des pièces obtenues."
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
            <TowerCard key={tower.element} tower={tower} />
          ))}
        </div>
      )}
      <TeamDock
        team={team.data?.team ?? []}
        onEdit={() => setEditorOpen(true)}
      />

      <TeamEditorPopup open={editorOpen} onOpenChange={setEditorOpen} />
    </PageShell>
  )
}

function TowerCard({ tower }: { tower: TowerSummary }) {
  const ElementIcon = ELEMENT_ICON[tower.element] ?? Flame
  const SlotIcon = SLOT_ICONS[tower.slot]
  const percent = Math.min((tower.highestFloor / tower.totalFloors) * 100, 100)

  return (
    <Link
      to="/tower/$element"
      params={{ element: tower.element }}
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
            <CardTitle className="text-lg">
              Tour {ELEMENT_LABELS[tower.element]}
            </CardTitle>
            <p className="flex items-center gap-1 text-xs text-text-light">
              <SlotIcon className="h-3.5 w-3.5" />
              Alimente le slot « {SLOT_LABELS[tower.slot]} »
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
      </Card>
    </Link>
  )
}
