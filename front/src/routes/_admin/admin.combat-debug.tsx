import { createFileRoute } from '@tanstack/react-router'
import { Plus, Swords, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  AttackPattern,
  BattleLogEntry,
  DebugBattleResult,
  SimulatorUnit,
} from '../../api/combat.api'
import { AdminPageHeader } from '../../components/admin/shared/AdminPageHeader.tsx'
import { BattleScene } from '../../components/battle/BattleScene'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import i18n from '../../i18n/index.ts'
import { useDebugBattle } from '../../queries/useDebugBattle'

export const Route = createFileRoute('/_admin/admin/combat-debug')({
  component: DebugBattlePage,
})

const ATTACK_PATTERNS: AttackPattern[] = [
  'BASIC',
  'AOE_3',
  'MULTI_2',
  'MONO_AMPLIFIED',
  'MONO_DOUBLE',
]

const PASSIVE_KEYS = [
  'VAMPIRISM',
  'AEGIS',
  'BANNER',
  'RIPOSTE',
  'REBIRTH',
  'EXECUTION',
  'VIGOR',
  'HASTE',
  'FORTIFY',
  'EMPOWER',
  'BULWARK',
  'FURY',
  'CRIT',
  'PIERCE',
  'NEMESIS',
  'RAMPART',
  'REGEN',
  'BLESSING',
  'SANCTUARY',
  'BURN',
  'POISON',
  'BLOODLUST',
] as const

const DEFAULT_TEAM_A: SimulatorUnit[] = [
  {
    id: 'A0',
    name: i18n.t('admin:combatDebug.defaultUnitName', { n: 1 }),
    hp: 200,
    atk: 20,
    def: 10,
    spd: 100,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
  },
  {
    id: 'A1',
    name: i18n.t('admin:combatDebug.defaultUnitName', { n: 2 }),
    hp: 200,
    atk: 20,
    def: 10,
    spd: 95,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
  },
  {
    id: 'A2',
    name: i18n.t('admin:combatDebug.defaultUnitName', { n: 3 }),
    hp: 200,
    atk: 20,
    def: 10,
    spd: 90,
    attackPattern: 'BASIC',
    passiveKey: null,
    palier: 1,
  },
]

const DEFAULT_TEAM_B: SimulatorUnit[] = [
  {
    id: 'B0',
    name: 'Boss',
    hp: 1500,
    atk: 40,
    def: 12,
    spd: 100,
    attackPattern: 'AOE_3',
    passiveKey: null,
    palier: 1,
  },
]

function DebugBattlePage() {
  const { t } = useTranslation('admin')
  const [teamA, setTeamA] = useState<SimulatorUnit[]>(DEFAULT_TEAM_A)
  const [teamB, setTeamB] = useState<SimulatorUnit[]>(DEFAULT_TEAM_B)
  const [seed, setSeed] = useState('debug-seed')
  const [timeoutTurns, setTimeoutTurns] = useState(30)
  const [submittedTeams, setSubmittedTeams] = useState<{
    teamA: SimulatorUnit[]
    teamB: SimulatorUnit[]
  } | null>(null)
  const [view, setView] = useState<'scene' | 'log'>('scene')

  const debugBattle = useDebugBattle()

  const onRun = () => {
    setSubmittedTeams({ teamA, teamB })
    setView('scene')
    debugBattle.mutate({ teamA, teamB, seed, timeoutTurns })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminPageHeader
        icon={Swords}
        kicker={t('common.kicker.system')}
        title={t('combatDebug.pageTitle')}
        subtitle={t('combatDebug.pageSubtitle')}
      />

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <TeamPanel
          label={t('combatDebug.teamALabel')}
          team={teamA}
          onChange={setTeamA}
          idPrefix="A"
        />
        <TeamPanel
          label={t('combatDebug.teamBLabel')}
          team={teamB}
          onChange={setTeamB}
          idPrefix="B"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label
            className="block text-xs text-text-light/70 mb-1"
            htmlFor="seed"
          >
            {t('combatDebug.seedLabel')}
          </label>
          <Input
            id="seed"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className="w-48"
          />
        </div>
        <div>
          <label
            className="block text-xs text-text-light/70 mb-1"
            htmlFor="timeout"
          >
            {t('combatDebug.timeoutLabel')}
          </label>
          <Input
            id="timeout"
            type="number"
            value={timeoutTurns}
            onChange={(e) => setTimeoutTurns(Number(e.target.value))}
            className="w-28"
          />
        </div>
        <Button onClick={onRun} disabled={debugBattle.isPending}>
          <Swords className="mr-2 h-4 w-4" />
          {debugBattle.isPending
            ? t('combatDebug.simulating')
            : t('combatDebug.run')}
        </Button>
      </div>

      {debugBattle.isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
          {t('combatDebug.errorPrefix', { message: String(debugBattle.error) })}
        </div>
      )}

      {debugBattle.data && submittedTeams && (
        <ResultPanel
          result={debugBattle.data}
          submittedTeams={submittedTeams}
          view={view}
          onViewChange={setView}
        />
      )}
    </div>
  )
}

function TeamPanel({
  label,
  team,
  onChange,
  idPrefix,
}: {
  label: string
  team: SimulatorUnit[]
  onChange: (t: SimulatorUnit[]) => void
  idPrefix: string
}) {
  const { t } = useTranslation('admin')
  const addUnit = () => {
    if (team.length >= 3) {
      return
    }
    onChange([
      ...team,
      {
        id: `${idPrefix}${team.length}`,
        name: `${label} ${team.length + 1}`,
        hp: 200,
        atk: 20,
        def: 10,
        spd: 100,
        attackPattern: 'BASIC',
        passiveKey: null,
        palier: 1,
      },
    ])
  }
  const removeUnit = (index: number) => {
    onChange(team.filter((_, i) => i !== index))
  }
  const updateUnit = (index: number, patch: Partial<SimulatorUnit>) => {
    onChange(team.map((u, i) => (i === index ? { ...u, ...patch } : u)))
  }

  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold">{label}</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={addUnit}
          disabled={team.length >= 3}
        >
          <Plus className="mr-1 h-3 w-3" /> {t('combatDebug.addUnit')}
        </Button>
      </div>
      <div className="space-y-3">
        {team.map((unit, i) => (
          <div
            key={unit.id}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <input
                value={unit.name ?? ''}
                onChange={(e) => updateUnit(i, { name: e.target.value })}
                className="bg-transparent text-sm font-semibold outline-none"
              />
              <button
                type="button"
                onClick={() => removeUnit(i)}
                className="text-destructive hover:text-destructive/80"
                aria-label={t('combatDebug.removeUnit')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <NumInput
                label={t('common:stats.hp')}
                value={unit.hp}
                onChange={(v) => updateUnit(i, { hp: v })}
              />
              <NumInput
                label={t('common:stats.atk')}
                value={unit.atk}
                onChange={(v) => updateUnit(i, { atk: v })}
              />
              <NumInput
                label={t('common:stats.def')}
                value={unit.def}
                onChange={(v) => updateUnit(i, { def: v })}
              />
              <NumInput
                label={t('common:stats.spd')}
                value={unit.spd}
                onChange={(v) => updateUnit(i, { spd: v })}
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div>
                <label
                  className="text-text-light/60"
                  htmlFor={`pattern-${unit.id}`}
                >
                  {t('combatDebug.patternLabel')}
                </label>
                <select
                  id={`pattern-${unit.id}`}
                  value={unit.attackPattern}
                  onChange={(e) =>
                    updateUnit(i, {
                      attackPattern: e.target.value as AttackPattern,
                    })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1"
                >
                  {ATTACK_PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-text-light/60"
                  htmlFor={`passive-${unit.id}`}
                >
                  {t('combatDebug.passiveLabel')}
                </label>
                <select
                  id={`passive-${unit.id}`}
                  value={unit.passiveKey ?? ''}
                  onChange={(e) =>
                    updateUnit(i, { passiveKey: e.target.value || null })
                  }
                  className="w-full rounded border border-border bg-background px-2 py-1"
                >
                  <option value="">{t('combatDebug.passiveNone')}</option>
                  {PASSIVE_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
              <NumInput
                label={t('combatDebug.tierLabel')}
                value={unit.palier}
                onChange={(v) =>
                  updateUnit(i, { palier: Math.max(1, Math.min(6, v)) })
                }
              />
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <div className="text-xs text-text-light/60 italic">
            {t('combatDebug.emptyTeam')}
          </div>
        )}
      </div>
    </div>
  )
}

function NumInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="text-text-light/60">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-border bg-background px-2 py-1"
      />
    </label>
  )
}

function ResultPanel({
  result,
  submittedTeams,
  view,
  onViewChange,
}: {
  result: DebugBattleResult
  submittedTeams: { teamA: SimulatorUnit[]; teamB: SimulatorUnit[] }
  view: 'scene' | 'log'
  onViewChange: (v: 'scene' | 'log') => void
}) {
  const { t } = useTranslation('admin')
  const wonLabel =
    result.won === 'A'
      ? t('combatDebug.result.teamAWins')
      : result.won === 'B'
        ? t('combatDebug.result.teamBWins')
        : t('combatDebug.result.timeout')
  const wonColor =
    result.won === 'A' || result.won === 'B'
      ? 'text-success'
      : 'text-destructive'

  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className={`font-bold ${wonColor}`}>{wonLabel}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-light/60">
            {t('combatDebug.result.actionsCount', { count: result.turns })}
          </span>
          <div className="flex rounded-full border border-border bg-background/40 p-0.5">
            <button
              type="button"
              onClick={() => onViewChange('scene')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                view === 'scene'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-light hover:text-text'
              }`}
            >
              {t('combatDebug.result.animationTab')}
            </button>
            <button
              type="button"
              onClick={() => onViewChange('log')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                view === 'log'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-text-light hover:text-text'
              }`}
            >
              {t('combatDebug.result.logTab')}
            </button>
          </div>
        </div>
      </div>

      {view === 'scene' ? (
        <BattleScene
          teamA={submittedTeams.teamA}
          teamB={submittedTeams.teamB}
          log={result.log}
        />
      ) : (
        <pre className="text-xs font-mono whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
          {result.log.map((entry, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: log is immutable result data
            <LogLine key={i} entry={entry} />
          ))}
        </pre>
      )}
    </div>
  )
}

type DamageEntry = { final: number; dodged: boolean }

function LogLine({ entry }: { entry: BattleLogEntry }) {
  switch (entry.type) {
    case 'ATTACK': {
      const targets = Array.isArray(entry.targetIds)
        ? (entry.targetIds as string[])
        : []
      const damages = Array.isArray(entry.damages)
        ? (entry.damages as DamageEntry[])
        : []
      return (
        <div className="text-text-light">
          ⚔️ {String(entry.attackerId)} → {targets.join(', ')} [
          {damages
            .map((d) => (d.dodged ? '✗ DODGED' : `-${d.final}`))
            .join(', ')}
          ]
        </div>
      )
    }
    case 'PASSIVE':
      return (
        <div className="text-primary">
          ✨ {String(entry.unitId)} · {String(entry.passive)} ·{' '}
          {JSON.stringify(entry.payload)}
        </div>
      )
    case 'DEATH':
      return (
        <div className="text-destructive">
          💀 {String(entry.unitId)} is down
        </div>
      )
    case 'REBIRTH':
      return (
        <div className="text-success">
          🌱 {String(entry.unitId)} revives to {String(entry.restoredHp)} HP
        </div>
      )
    case 'BANNER_APPLIED':
      return (
        <div className="text-primary">
          🚩 Side {String(entry.side)}: +{String(entry.bonusPct)}% ATK
        </div>
      )
    case 'TURN_END':
      return (
        <div className="text-text-light/40">— Turn {String(entry.turn)} —</div>
      )
    case 'TIMEOUT':
      return <div className="text-destructive">⏱ Timeout reached</div>
    case 'WIN':
      return (
        <div className="text-success">🏆 Side {String(entry.side)} wins</div>
      )
    default:
      return <div className="text-text-light/60">{JSON.stringify(entry)}</div>
  }
}
