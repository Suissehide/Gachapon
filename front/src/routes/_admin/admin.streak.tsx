import { createFileRoute } from '@tanstack/react-router'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Crown,
  Flame,
  Pencil,
  Plus,
  RectangleVertical,
  Sparkles,
  Star,
  Ticket,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { RewardPatch } from '../../api/admin-streak.api.ts'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { ReactTable } from '../../components/table/reactTable.tsx'
import { Badge } from '../../components/ui/badge.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Input } from '../../components/ui/input.tsx'
import { Label } from '../../components/ui/label.tsx'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet.tsx'
import {
  type CardRarity,
  RARITY_OPTIONS,
} from '../../constants/card.constant.ts'
import type {
  AdminMilestone,
  StreakReward,
} from '../../constants/streak.constant.ts'
import { RARITY_BADGE_VARIANT } from '../../libs/rarity.ts'
import {
  useAdminCreateMilestone,
  useAdminDeleteMilestone,
  useAdminPatchMilestone,
  useAdminPatchStreakDefault,
  useAdminStreak,
} from '../../queries/useAdminStreak.ts'

export const Route = createFileRoute('/_admin/admin/streak')({
  component: AdminStreakPage,
})

type DrawerMode =
  | { type: 'edit'; milestone: AdminMilestone }
  | { type: 'create' }
  | null

// ── Reward editor ─────────────────────────────────────────────────────────

type RewardDraft = {
  tokens: string
  dust: string
  xp: string
  cardRarity: CardRarity | null
}

function emptyDraft(seed?: Partial<StreakReward>): RewardDraft {
  return {
    tokens: String(seed?.tokens ?? 0),
    dust: String(seed?.dust ?? 0),
    xp: String(seed?.xp ?? 0),
    cardRarity: seed?.cardRarity ?? null,
  }
}

function draftToPayload(draft: RewardDraft): RewardPatch {
  return {
    tokens: Number(draft.tokens) || 0,
    dust: Number(draft.dust) || 0,
    xp: Number(draft.xp) || 0,
    cardRarity: draft.cardRarity,
  }
}

const rarityIcon = (rarity: CardRarity) => {
  switch (rarity) {
    case 'EPIC':
      return <Star className="h-3.5 w-3.5" />
    case 'LEGENDARY':
      return <Crown className="h-3.5 w-3.5" />
    default:
      return <RectangleVertical className="h-3.5 w-3.5" />
  }
}

function RewardEditor({
  draft,
  onChange,
}: {
  draft: RewardDraft
  onChange: (next: RewardDraft) => void
}) {
  return (
    <div className="space-y-3">
      <NumberField
        label="Jetons"
        icon={<Ticket className="h-3.5 w-3.5 text-primary" />}
        value={draft.tokens}
        onChange={(tokens) => onChange({ ...draft, tokens })}
      />
      <NumberField
        label="Poussière"
        icon={<Sparkles className="h-3.5 w-3.5 text-info" />}
        value={draft.dust}
        onChange={(dust) => onChange({ ...draft, dust })}
      />
      <NumberField
        label="XP"
        icon={<Star className="h-3.5 w-3.5 text-success" />}
        value={draft.xp}
        onChange={(xp) => onChange({ ...draft, xp })}
      />
      <RarityField
        value={draft.cardRarity}
        onChange={(cardRarity) => onChange({ ...draft, cardRarity })}
      />
    </div>
  )
}

function NumberField({
  label,
  icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ReactNode
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        {icon}
        {label}
      </Label>
      <Input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
      />
    </div>
  )
}

function RarityField({
  value,
  onChange,
}: {
  value: CardRarity | null
  onChange: (next: CardRarity | null) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <RectangleVertical className="h-3.5 w-3.5 text-primary" />
        Rareté de la carte
      </Label>
      <div className="flex flex-wrap gap-1">
        {RARITY_OPTIONS.map((opt) => {
          const rarity = opt.value as CardRarity
          const active = value === rarity
          return (
            <button
              key={rarity}
              type="button"
              onClick={() => onChange(active ? null : rarity)}
              className={[
                'cursor-pointer flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                active
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-border bg-card text-text-light hover:text-text',
              ].join(' ')}
            >
              {rarityIcon(rarity)}
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────
function AdminStreakPage() {
  const { data, isLoading } = useAdminStreak()
  const patchDefault = useAdminPatchStreakDefault()
  const createMilestone = useAdminCreateMilestone()
  const patchMilestone = useAdminPatchMilestone()
  const deleteMilestone = useAdminDeleteMilestone()

  // Default reward editor — initialised from server data.
  const [defaultDraft, setDefaultDraft] = useState<RewardDraft>(() =>
    emptyDraft(),
  )
  useEffect(() => {
    if (data?.default) {
      setDefaultDraft(emptyDraft(data.default))
    }
  }, [data?.default])

  const [drawer, setDrawer] = useState<DrawerMode>(null)
  const [draft, setDraft] = useState<RewardDraft & { day: string }>(() => ({
    ...emptyDraft(),
    day: '',
  }))

  const openCreate = () => {
    setDraft({ ...emptyDraft(), day: '' })
    setDrawer({ type: 'create' })
  }

  const openEdit = (m: AdminMilestone) => {
    setDraft({ ...emptyDraft(m), day: String(m.day) })
    setDrawer({ type: 'edit', milestone: m })
  }

  const closeDrawer = () => setDrawer(null)

  const handleSaveDrawer = () => {
    const payload = draftToPayload(draft)
    if (drawer?.type === 'create') {
      const day = Number(draft.day)
      if (!day) {
        return
      }
      createMilestone.mutate({ day, ...payload }, { onSuccess: closeDrawer })
    } else if (drawer?.type === 'edit') {
      patchMilestone.mutate(
        { id: drawer.milestone.id, data: payload },
        { onSuccess: closeDrawer },
      )
    }
  }

  const columns = useMemo<ColumnDef<AdminMilestone>[]>(
    () => [
      {
        accessorKey: 'day',
        header: 'Jour',
        size: 80,
        cell: ({ row }) => (
          <span className="tabular-nums text-text">
            Jour {row.original.day}
          </span>
        ),
      },
      {
        id: 'reward',
        header: 'Récompense',
        cell: ({ row }) => <MilestoneRewardSummary milestone={row.original} />,
      },
      {
        id: 'actions',
        header: '',
        size: 80,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                const m = row.original
                setDraft({ ...emptyDraft(m), day: String(m.day) })
                setDrawer({ type: 'edit', milestone: m })
              }}
              title="Modifier"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                if (
                  confirm(`Supprimer le jalon du jour ${row.original.day} ?`)
                ) {
                  deleteMilestone.mutate(row.original.id)
                }
              }}
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteMilestone],
  )

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-text-light">
        Chargement…
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-6 p-8">
      <AdminPageHeader
        icon={Flame}
        kicker="Économie"
        title="Streak — Récompenses"
        subtitle="Récompenses quotidiennes et jalons spéciaux de connexion"
      />

      {/* Default daily reward */}
      <section className="w-full">
        <div className="w-full flex items-center gap-4 mb-4">
          <h3 className="text-md font-semibold text-text-light">
            Récompense quotidienne par défaut
          </h3>
          <div className="flex-1 border-b border-border" />
        </div>
        <div className="space-y-4 rounded-md border border-border bg-card p-4">
          <RewardEditor draft={defaultDraft} onChange={setDefaultDraft} />

          <div className="flex justify-end">
            <Button
              onClick={() => patchDefault.mutate(draftToPayload(defaultDraft))}
              disabled={patchDefault.isPending}
            >
              Sauvegarder
            </Button>
          </div>
        </div>
      </section>

      {/* Milestones table */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border/40 mb-4">
          <h3 className="text-md font-semibold text-text-light">
            Jalons spéciaux
          </h3>
          <div className="flex-1 border-b border-border" />
          <Button size="default" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau jalon
          </Button>
        </div>

        <ReactTable
          columns={columns}
          data={data.milestones}
          filterId="admin-streak-milestones"
          onRowClick={(row) => openEdit(row.original)}
        />
      </div>

      {/* Create / Edit drawer */}
      <Sheet
        open={drawer !== null}
        onOpenChange={(open) => !open && closeDrawer()}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {drawer?.type === 'create'
                ? 'Nouveau jalon'
                : `Jalon — Jour ${drawer?.type === 'edit' ? drawer.milestone.day : ''}`}
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-6 py-5">
            {drawer?.type === 'create' && (
              <div className="space-y-1.5">
                <Label>Jour</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.day}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, day: e.target.value }))
                  }
                  placeholder="ex: 7"
                />
              </div>
            )}
            <RewardEditor
              draft={draft}
              onChange={(next) => setDraft((d) => ({ ...next, day: d.day }))}
            />
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={handleSaveDrawer}
                disabled={createMilestone.isPending || patchMilestone.isPending}
              >
                {drawer?.type === 'create' ? 'Créer' : 'Sauvegarder'}
              </Button>
              <Button variant="outline" onClick={closeDrawer}>
                Annuler
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Compact, multi-type summary for the milestone table — mirrors how the user
// modal collapses several reward types into a single row of badges.
function MilestoneRewardSummary({ milestone }: { milestone: AdminMilestone }) {
  const items: React.ReactNode[] = []
  if (milestone.cardRarity) {
    items.push(
      <Badge
        key="card"
        variant={RARITY_BADGE_VARIANT[milestone.cardRarity] ?? 'neutral'}
        size="sm"
      >
        {rarityIcon(milestone.cardRarity)}
        Carte {milestone.cardRarity.toLowerCase()}
      </Badge>,
    )
  }
  if (milestone.tokens > 0) {
    items.push(
      <Badge key="tokens" variant="primary" size="sm">
        <Ticket className="h-3 w-3" />
        {milestone.tokens}
      </Badge>,
    )
  }
  if (milestone.dust > 0) {
    items.push(
      <Badge key="dust" variant="info" size="sm">
        <Sparkles className="h-3 w-3" />
        {milestone.dust}
      </Badge>,
    )
  }
  if (milestone.xp > 0) {
    items.push(
      <Badge key="xp" variant="success" size="sm">
        <Star className="h-3 w-3" />
        {milestone.xp} XP
      </Badge>,
    )
  }

  if (items.length === 0) {
    return <span className="text-text-light/40">—</span>
  }
  return <div className="flex flex-wrap items-center gap-1.5">{items}</div>
}
