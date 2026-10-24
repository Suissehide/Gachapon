import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Plus, Swords, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { DummySpec } from '../../api/combat.api.ts'
import { TeamDock } from '../../components/battle/TeamDock.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { TcgCardFace } from '../../components/shared/tcg-card/TcgCardFace.tsx'
import { TeamEditorPopup } from '../../components/team/TeamEditorPopup.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Card } from '../../components/ui/card.tsx'
import { Select } from '../../components/ui/input.tsx'
import { NumberStepper } from '../../components/ui/numberStepper.tsx'
import {
  type CardElement,
  ELEMENT_COLOR,
  ELEMENT_LABELS,
  ELEMENT_ORDER,
} from '../../constants/card.constant.ts'
import {
  DUMMY_TEAM_KEY,
  DUMMY_TEAM_LABEL,
} from '../../constants/combatTeam.constant.ts'
import {
  ATTACK_PATTERNS,
  DEFAULT_DUMMY,
  dummySearchSchema,
  MAX_DUMMIES,
} from '../../constants/dummy.constant.ts'
import { currentLocale } from '../../i18n/index.ts'
import { type DummyTry, readDummyHistory } from '../../libs/dummyHistory.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import { useAuthStore } from '../../stores/auth.store.ts'

export const Route = createFileRoute('/_authenticated/dummy')({
  component: DummySetupPage,
  validateSearch: dummySearchSchema,
})

const NEUTRAL = 'NEUTRAL'
const NEUTRAL_COLOR = 'var(--color-slate-400)'
const STAT_MAX = 100_000
const STAT_STEP = 50
const HISTORY_SHOWN = 5
// Les poutchs n'ont pas d'identité propre : seule leur place compte.
const SLOT_KEYS = Array.from({ length: MAX_DUMMIES }, (_, i) => `dummy-${i}`)
const TEAM_SLOT_KEYS = ['team-0', 'team-1', 'team-2']
const ELEMENT_CHOICES: (CardElement | null)[] = [null, ...ELEMENT_ORDER]

const LABEL =
  'mb-1.5 block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-foreground/45'

function fmt(n: number): string {
  return formatNumber(n, currentLocale())
}

function elementColor(element: string | null): string {
  return element
    ? (ELEMENT_COLOR[element as CardElement] ?? NEUTRAL_COLOR)
    : NEUTRAL_COLOR
}

const perTurn = (t: DummyTry) => Math.round(t.totalDamage / t.turns)

function DummySetupPage() {
  const { t } = useTranslation('combat')
  const navigate = useNavigate()
  const { dummies } = Route.useSearch()
  const userId = useAuthStore((s) => s.user?.id)
  const team = useCombatTeam(DUMMY_TEAM_KEY).data?.team ?? []
  const [editorOpen, setEditorOpen] = useState(false)
  // Relu à chaque arrivée sur la page : le combat vient d'y écrire.
  const [history] = useState(() => (userId ? readDummyHistory(userId) : []))

  const setDummies = (next: DummySpec[]) =>
    navigate({ to: '/dummy', search: { dummies: next }, replace: true })
  const update = (index: number, patch: Partial<DummySpec>) =>
    setDummies(dummies.map((d, i) => (i === index ? { ...d, ...patch } : d)))

  return (
    <PageShell width="wide">
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: t('combat:dummy.title') },
        ]}
        title={t('combat:dummy.title')}
        subtitle={t('combat:dummy.subtitle')}
      />

      <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {dummies.map((dummy, i) => (
              <DummyCard
                key={SLOT_KEYS[i]}
                index={i}
                dummy={dummy}
                removable={dummies.length > 1}
                onChange={(patch) => update(i, patch)}
                onRemove={() => setDummies(dummies.filter((_, j) => j !== i))}
              />
            ))}

            {dummies.length < MAX_DUMMIES && (
              <Button
                variant="dashed"
                size="bare"
                className="min-h-40 flex-col gap-1.5 rounded-[20px] bg-white/50 font-bold"
                onClick={() => setDummies([...dummies, DEFAULT_DUMMY])}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" />
                  {t('combat:dummy.add')}
                </span>
                <small className="text-[12.5px] font-medium">
                  {t('combat:dummy.addCount', {
                    count: dummies.length,
                    max: MAX_DUMMIES,
                  })}
                </small>
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              size="lg"
              className="gap-2"
              disabled={team.length === 0}
              onClick={() =>
                navigate({ to: '/dummy/fight', search: { dummies } })
              }
            >
              <Swords className="h-4 w-4" />
              {t('combat:dummy.fight')}
            </Button>
          </div>
        </div>

        <HistoryPanel history={history} onReload={setDummies} />
      </div>

      <TeamDock
        team={team}
        onEdit={() => setEditorOpen(true)}
        modeLabel={DUMMY_TEAM_LABEL}
      />
      <TeamEditorPopup
        open={editorOpen}
        onOpenChange={setEditorOpen}
        teamKey={DUMMY_TEAM_KEY}
        modeLabel={DUMMY_TEAM_LABEL}
      />
    </PageShell>
  )
}

/** Carte TCG du poutch, montée comme celle des ennemis (`EnemyCard`). */
function DummyPortrait({ element }: { element: CardElement | null }) {
  return (
    <div className="relative aspect-[2/3] w-[62px] shrink-0">
      <TcgCardFace
        rarity="COMMON"
        name=""
        setName=""
        imageUrl={null}
        variant="NORMAL"
        isOwned
        compact
        showName={false}
        element={element}
      />
    </div>
  )
}

function DummyCard({
  index,
  dummy,
  removable,
  onChange,
  onRemove,
}: {
  index: number
  dummy: DummySpec
  removable: boolean
  onChange: (patch: Partial<DummySpec>) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('combat')
  const id = `dummy-${index}`
  const elementLabel = dummy.element
    ? ELEMENT_LABELS[dummy.element]
    : t('combat:dummy.neutral')

  return (
    <Card className="@container flex flex-col gap-3.5 rounded-[20px] p-[18px]">
      <div className="flex items-center gap-3">
        <DummyPortrait element={dummy.element} />
        <div className="min-w-0">
          <p className="font-display text-[19px] font-extrabold leading-tight">
            {t('combat:dummy.name', { n: index + 1 })}
          </p>
          <p className="text-[13px] text-foreground/55">{elementLabel}</p>
        </div>
        {removable && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-[30px] w-[30px] text-foreground/40"
            aria-label={t('combat:dummy.remove')}
            onClick={onRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div>
        <label htmlFor={`${id}-element`} className={LABEL}>
          {t('combat:dummy.element')}
        </label>
        <Select
          id={`${id}-element`}
          clearable={false}
          className="h-10 rounded-[11px]"
          value={dummy.element ?? NEUTRAL}
          onValueChange={(v) =>
            onChange({ element: v === NEUTRAL ? null : (v as CardElement) })
          }
          options={ELEMENT_CHOICES.map((el) => ({
            value: el ?? NEUTRAL,
            label: el ? ELEMENT_LABELS[el] : t('combat:dummy.neutral'),
            icon: (
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: elementColor(el) }}
              />
            ),
          }))}
        />
      </div>

      {/* Côte à côte dès que la fiche le permet : sous ~270 px, deux champs
          à boutons −/+ ne laissent plus la place d'afficher 100 000. */}
      <div className="grid grid-cols-1 gap-2.5 @[270px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <label htmlFor={`${id}-def`} className={LABEL}>
            {t('combat:dummy.def')}
          </label>
          <NumberStepper
            id={`${id}-def`}
            value={dummy.def}
            max={STAT_MAX}
            step={STAT_STEP}
            onChange={(def) => onChange({ def })}
          />
        </div>
        <div>
          <label htmlFor={`${id}-atk`} className={LABEL}>
            {t('combat:dummy.atk')}
          </label>
          <NumberStepper
            id={`${id}-atk`}
            value={dummy.atk}
            max={STAT_MAX}
            step={STAT_STEP}
            onChange={(atk) => onChange({ atk })}
          />
          {dummy.atk === 0 && (
            <p className="mt-1 text-xs text-foreground/50">
              {t('combat:dummy.atkHint')}
            </p>
          )}
        </div>
      </div>

      {dummy.atk > 0 && (
        <div>
          <label htmlFor={`${id}-pattern`} className={LABEL}>
            {t('combat:dummy.pattern')}
          </label>
          <Select
            id={`${id}-pattern`}
            clearable={false}
            value={dummy.attackPattern}
            onValueChange={(v) =>
              onChange({ attackPattern: v as DummySpec['attackPattern'] })
            }
            options={ATTACK_PATTERNS.map((p) => ({
              value: p,
              label: t(`combat:dummy.patterns.${p}`),
            }))}
          />
        </div>
      )}
    </Card>
  )
}

function HistoryPanel({
  history,
  onReload,
}: {
  history: DummyTry[]
  onReload: (dummies: DummySpec[]) => void
}) {
  const { t } = useTranslation('combat')
  const record = history.reduce<DummyTry | null>(
    (best, x) => (!best || x.totalDamage > best.totalDamage ? x : best),
    null,
  )
  const shown = history.slice(0, HISTORY_SHOWN)

  return (
    <Card className="flex flex-col gap-2.5 self-start rounded-[20px] p-[18px]">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[19px] font-extrabold">
          {t('combat:dummy.history.title')}
        </h3>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-foreground/45">
          {t('combat:dummy.history.legend')}
        </span>
      </div>

      {record ? (
        <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-3.5">
          <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-foreground/45">
            {t('combat:dummy.history.record')}
          </span>
          <b className="block font-display text-[30px] font-extrabold leading-none tabular-nums text-amber-600">
            {fmt(record.totalDamage)}
          </b>
          <small className="mt-1 block text-[12.5px] text-foreground/60">
            {t('combat:dummy.history.recordDetail', {
              perTurn: fmt(perTurn(record)),
              n: record.n,
            })}
          </small>
        </div>
      ) : (
        <p className="text-sm text-foreground/55">
          {t('combat:dummy.history.empty')}
        </p>
      )}

      {shown.map((x, i) => {
        const previous = history[i + 1]
        const delta = previous ? x.totalDamage - previous.totalDamage : null
        return (
          <div
            key={x.n}
            className={cn(
              'grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-foreground/6 px-1 py-2.5',
              i === 0 && 'rounded-xl border-transparent bg-amber-50/60',
            )}
          >
            <span className="font-mono text-xs text-foreground/45">#{x.n}</span>
            <div className="min-w-0">
              <div className="font-display text-[17px] font-extrabold tabular-nums">
                {fmt(x.totalDamage)}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-foreground/55">
                <span className="inline-flex gap-1">
                  {x.team.map((el, j) => (
                    <span
                      key={TEAM_SLOT_KEYS[j]}
                      className="h-[22px] w-4 rounded-[4px]"
                      style={{ background: elementColor(el) }}
                    />
                  ))}
                </span>
                {t('combat:dummy.history.turns', { count: x.turns })}
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="font-mono text-[13px] font-bold">
                {t('combat:dummy.history.perTurn', { value: fmt(perTurn(x)) })}
              </span>
              {delta !== null && (
                <span
                  className={cn(
                    'font-mono text-xs font-bold',
                    delta >= 0 ? 'text-green-700' : 'text-rose-700',
                  )}
                >
                  {delta >= 0 ? '+' : '−'}
                  {fmt(Math.abs(delta))}
                </span>
              )}
              {i > 0 && (
                <Button
                  variant="link"
                  size="bare"
                  className="text-xs font-bold text-amber-700"
                  onClick={() => onReload(x.dummies)}
                >
                  {t('combat:dummy.history.reload')}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </Card>
  )
}
