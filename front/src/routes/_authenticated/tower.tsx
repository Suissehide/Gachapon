import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Flame, Zap } from 'lucide-react'

import type { TowerSummary } from '../../api/tower.api.ts'
import {
  SLOT_ICONS,
  SLOT_LABELS,
} from '../../components/collection/EquipmentSlotsPanel.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { Card, CardTitle } from '../../components/ui/card.tsx'
import {
  ELEMENT_COLOR,
  ELEMENT_ICON,
  ELEMENT_LABELS,
} from '../../constants/card.constant.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useTowers } from '../../queries/useTower.ts'

export const Route = createFileRoute('/_authenticated/tower')({
  component: TowerListPage,
})

function TowerListPage() {
  const towers = useTowers()
  const combatPoints = useCombatPoints()

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[{ label: 'Gachapon', to: '/play' }, { label: 'Tours' }]}
        title="Tours élémentaires"
        subtitle="Chaque tour alimente un slot d'équipement précis. Farmer l'étage 10 est le but : c'est là que tombent les hautes raretés."
        right={
          combatPoints.data ? (
            <span className="inline-flex items-center gap-1.5 font-mono text-sm text-text-light">
              <Zap className="h-4 w-4 text-violet-500" />
              {combatPoints.data.combatPoints} / {combatPoints.data.maxStock}
              <span className="text-text-light/60">
                — partagés avec la campagne
              </span>
            </span>
          ) : null
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
            <TowerCard key={tower.element} tower={tower} />
          ))}
        </div>
      )}
    </PageShell>
  )
}

function TowerCard({ tower }: { tower: TowerSummary }) {
  const ElementIcon = ELEMENT_ICON[tower.element] ?? Flame
  const SlotIcon = SLOT_ICONS[tower.slot]
  const isFarmReady = tower.highestFloor >= tower.totalFloors
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
          {isFarmReady ? (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600">
              Spot de farm
            </span>
          ) : (
            <ArrowRight className="h-4 w-4 shrink-0 text-text-light" />
          )}
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
