import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  Layers,
  Lock,
  type LucideIcon,
  RotateCcw,
  Settings,
  Shield,
  Sparkles,
  Star,
  Swords,
  Zap,
} from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { CSSProperties } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod/v4'

import type {
  Campaign,
  CampaignChapter,
  CampaignStage,
  SweepResult,
} from '../../api/campaign.api.ts'
import type { TeamUnit } from '../../api/combat.api.ts'
import {
  DropCard,
  RESULT_BADGE_WIN,
  ResultBadge,
  ResultPanel,
  RewardTile,
} from '../../components/battle/resultKit.tsx'
import { AuroraGrid } from '../../components/shared/decorations/AuroraGrid'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { getRarityTone } from '../../components/shared/tcg-card/config.ts'
import { TcgCardFace } from '../../components/shared/tcg-card/TcgCardFace.tsx'
import { TeamEditorPopup } from '../../components/team/TeamEditorPopup.tsx'
import { Button } from '../../components/ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
} from '../../components/ui/popup.tsx'
import { useCampaign, useSweepStage } from '../../queries/useCampaign.ts'
import { useCombatPoints } from '../../queries/useCombatPoints.ts'
import { useCombatTeam } from '../../queries/useCombatTeam.ts'
import { computePower } from '../../utils/cardStats.ts'

const campaignSearchSchema = z.object({
  editor: z.boolean().optional(),
  // ?prep=true auto-opens the pre-battle modal for the next playable stage
  // (used by the battle page's "Étage suivant" button after a victory).
  prep: z.boolean().optional(),
})

export const Route = createFileRoute('/_authenticated/campaign')({
  component: CampaignPage,
  validateSearch: campaignSearchSchema,
})

// Per-chapter theme (hue + title). Fallback for chapters beyond the known list
// keeps a deterministic hue derived from the chapter number so themes stay
// stable across sessions.
const CHAPTER_META: { title: string; hue: number }[] = [
  { title: 'Plaines', hue: 35 },
  { title: 'Forêt des Murmures', hue: 150 },
  { title: 'Cendres', hue: 320 },
  { title: 'Océan', hue: 200 },
  { title: 'Cristaux', hue: 280 },
  { title: 'Volcan', hue: 12 },
  { title: 'Toundra', hue: 195 },
]

function chapterMeta(n: number): { title: string; hue: number } {
  return CHAPTER_META[n - 1] ?? { title: `Chapitre ${n}`, hue: (n * 47) % 360 }
}

// The "frontier" chapter is the one holding the player's next playable stage
// (status === 'current'), or null once every stage is cleared. Once a chapter's
// boss is cleared the frontier moves to the freshly-unlocked first stage of the
// next chapter — even though the backend's `highestChapter` only advances after
// that stage is actually beaten. Using `highestChapter` for the "Actuel" marker
// would lag a chapter behind after a boss clear, or falsely flag a 100%-cleared
// final chapter (no next chapter) as current — hence null in that case.
function frontierChapter(data: Campaign): number | null {
  const withCurrent = data.chapters.find((c) =>
    c.stages.some((s) => s.status === 'current'),
  )
  return withCurrent?.chapter ?? null
}

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

function CampaignPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const campaign = useCampaign()
  const team = useCombatTeam()
  const points = useCombatPoints()
  const sweep = useSweepStage()

  const [activeChapter, setActiveChapter] = useState<number | null>(null)
  const [prep, setPrep] = useState<CampaignStage | null>(null)
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  // When the team editor is opened from the prep modal we remember which stage
  // to return to, so closing the editor (Valider/Annuler) reopens the prep
  // modal instead of dropping the player back on the bare campaign.
  const [editorReturnStage, setEditorReturnStage] =
    useState<CampaignStage | null>(null)

  // ?editor=true auto-opens the team editor popup (used by /combat redirect and
  // the battle page's "revoir mon équipe" link).
  useEffect(() => {
    if (search.editor) {
      setEditorOpen(true)
      navigate({ to: '/campaign', search: {}, replace: true })
    }
  }, [search.editor, navigate])

  // ?prep=true auto-opens the pre-battle modal for the next playable stage —
  // the one marked `status === 'current'`. If the campaign/chapter is fully
  // cleared there is no such stage, so we just land on the campaign normally.
  // Also snaps the active chapter to that stage's chapter so the panel behind
  // the popup matches.
  useEffect(() => {
    if (search.prep && campaign.data) {
      const nextStage = campaign.data.chapters
        .flatMap((c) => c.stages)
        .find((s) => s.status === 'current')
      if (nextStage) {
        setActiveChapter(frontierChapter(campaign.data))
        setPrep(nextStage)
      }
      navigate({ to: '/campaign', search: {}, replace: true })
    }
  }, [search.prep, campaign.data, navigate])

  // Initialise the active chapter to the frontier (the chapter with the next
  // playable stage) once the campaign response lands — not `highestChapter`,
  // which lags a chapter behind once a boss is cleared.
  useEffect(() => {
    if (activeChapter == null && campaign.data) {
      // Land on the frontier chapter; once everything is cleared there is no
      // frontier, so fall back to the furthest-reached chapter.
      setActiveChapter(
        frontierChapter(campaign.data) ?? campaign.data.highestChapter,
      )
    }
  }, [activeChapter, campaign.data])

  if (campaign.isLoading || activeChapter == null) {
    return (
      <PageShell>
        <p className="text-text-light">Chargement de la campagne…</p>
      </PageShell>
    )
  }
  if (campaign.isError || !campaign.data) {
    return (
      <PageShell>
        <p className="text-rose-500">Erreur de chargement de la campagne.</p>
      </PageShell>
    )
  }
  const data = campaign.data
  const chapter = data.chapters.find((c) => c.chapter === activeChapter)

  const hasTeam = (team.data?.team.length ?? 0) >= 1
  const currentPC = points.data?.combatPoints ?? 0
  const battleCost = points.data?.battleCost ?? 1
  const sweepCost = points.data?.sweepCost ?? 1
  const canBattle = currentPC >= battleCost && hasTeam
  const canSweep = currentPC >= sweepCost * 3 && hasTeam

  const handleFight = () => {
    if (!prep) {
      return
    }
    navigate({ to: '/battle/$stageId', params: { stageId: prep.id } })
  }
  const handleSweep = () => {
    if (!prep) {
      return
    }
    sweep.mutate(
      { stageId: prep.id, runs: 3 },
      {
        onSuccess: (result) => {
          setSweepResult(result)
          setPrep(null)
        },
      },
    )
  }

  return (
    <div
      className="relative min-h-[calc(100vh-var(--topbar-h))] pb-32"
      style={{ background: '#fbf8f3', color: '#1b1726' }}
    >
      {/* Fond partagé « Arcade clair » (halos + grille) — cf. /collection */}
      <AuroraGrid />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-8">
        {/* Header */}
        <header>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-text-light/60">
            Gachapon / Campagne
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
            Campagne
          </h1>
          <p className="mt-2.5 text-[15px] text-text-light">
            Progresse à travers les chapitres pour débloquer drops et puissance
          </p>
        </header>

        {/* Chapter strip */}
        <div className="mt-7">
          <ChapterStrip
            chapters={data.chapters}
            currentChapter={frontierChapter(data)}
            activeChapter={activeChapter}
            onPick={setActiveChapter}
          />
        </div>

        {/* Chapter panel */}
        {chapter && (
          <div className="mt-5 rounded-3xl border border-[rgba(27,23,38,0.06)] bg-white p-5 shadow-[0_2px_0_rgba(27,23,38,0.03),0_20px_44px_-26px_rgba(27,23,38,0.16)] sm:p-7">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {chapter.stages.map((stage) => (
                <LevelCard
                  key={stage.id}
                  stage={stage}
                  onOpen={() => setPrep(stage)}
                  battleCost={battleCost}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Persistent team dock */}
      <TeamDock
        team={team.data?.team ?? []}
        onEdit={() => setEditorOpen(true)}
      />

      {/* Team editor popup — mirrors the mockup's TeamEditor modal. When it was
          opened from the prep modal, closing it reopens that prep modal. */}
      <TeamEditorPopup
        open={editorOpen}
        onOpenChange={(v) => {
          setEditorOpen(v)
          if (!v && editorReturnStage) {
            setPrep(editorReturnStage)
            setEditorReturnStage(null)
          }
        }}
      />

      {/* Prep modal */}
      {prep && (
        <Popup
          open
          onOpenChange={(v) => {
            if (!v) {
              setPrep(null)
            }
          }}
        >
          <PopupContent
            size="lg"
            className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden bg-[#fbf8f3] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.6)]"
          >
            <Dialog.Title className="sr-only">
              Préparation du combat
            </Dialog.Title>
            <PrepModal
              stage={prep}
              chapter={activeChapter}
              team={team.data?.team ?? []}
              currentPC={currentPC}
              battleCost={battleCost}
              sweepCost={sweepCost}
              canBattle={canBattle}
              canSweep={canSweep}
              sweepPending={sweep.isPending}
              onFight={handleFight}
              onSweep={handleSweep}
              onEditTeam={() => {
                setEditorReturnStage(prep)
                setEditorOpen(true)
              }}
              onClose={() => setPrep(null)}
            />
          </PopupContent>
        </Popup>
      )}

      {/* Sweep result popup */}
      {sweepResult && (
        <Popup
          open
          onOpenChange={(v) => {
            if (!v) {
              setSweepResult(null)
            }
          }}
        >
          <PopupContent
            size="lg"
            className="border-0 bg-[#fbf8f3] p-0 shadow-[0_30px_80px_-12px_rgba(0,0,0,0.4)]"
          >
            <Dialog.Title className="sr-only">Farm terminé</Dialog.Title>
            <ResultPanel halo>
              <ResultBadge
                className={RESULT_BADGE_WIN}
                icon={<Zap className="h-8 w-8" />}
              />
              <h2 className="mt-4 font-display text-3xl font-bold text-text">
                Farm terminé
              </h2>
              <p className="mt-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-text-light/70">
                × {sweepResult.runs} passages
              </p>

              <div className="mt-6 grid w-full grid-cols-3 gap-2.5">
                <RewardTile
                  icon={<Coins className="h-5 w-5" />}
                  label="Pièces"
                  value={sweepResult.totalGold}
                  tone="#f59e0b"
                />
                <RewardTile
                  icon={<Sparkles className="h-5 w-5" />}
                  label="Poussière"
                  value={sweepResult.totalDust}
                  tone="#8b5cf6"
                />
                <RewardTile
                  icon={<Star className="h-5 w-5" />}
                  label="XP"
                  value={sweepResult.totalXp}
                  tone="#3b82f6"
                />
              </div>

              {sweepResult.equipmentDrops.map((e, i) => (
                <DropCard
                  // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral
                  key={i}
                  tone="amber"
                  label="Équipement"
                  name={e.name}
                  rarity={e.rarity}
                />
              ))}
              {sweepResult.cardDrops.map((c, i) => (
                <DropCard
                  // biome-ignore lint/suspicious/noArrayIndexKey: ephemeral
                  key={i}
                  tone="sky"
                  label="Carte"
                  name={c.name}
                  rarity={c.rarity}
                />
              ))}

              <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => setSweepResult(null)} className="gap-2">
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </ResultPanel>
          </PopupContent>
        </Popup>
      )}
    </div>
  )
}

// ── Chapter strip ────────────────────────────────────────────────────────────

function ChapterStrip({
  chapters,
  currentChapter,
  activeChapter,
  onPick,
}: {
  chapters: CampaignChapter[]
  currentChapter: number | null
  activeChapter: number
  onPick: (n: number) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const update = useCallback(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const max = el.scrollWidth - el.clientWidth
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft < max - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  // Auto-center the active chapter tab.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    const tab = el.querySelector<HTMLElement>(`[data-ch="${activeChapter}"]`)
    if (!tab) {
      return
    }
    const target = tab.offsetLeft - (el.clientWidth - tab.clientWidth) / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
  }, [activeChapter])

  const nudge = (dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) {
      return
    }
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: 'smooth' })
  }

  // Fade mask only applied on the side where content is actually clipped.
  // At scrollLeft=0 the left edge stays crisp; same for the right when the
  // list has been scrolled to the end (or when there's nothing to scroll).
  const leftStop = edges.left ? '24px' : '0'
  const rightStop = edges.right ? 'calc(100% - 24px)' : '100%'
  const maskImage = `linear-gradient(90deg, transparent 0, #000 ${leftStop}, #000 ${rightStop}, transparent 100%)`

  return (
    <div className="relative flex items-center">
      <StripArrow
        direction="left"
        onClick={() => nudge(-1)}
        hidden={!edges.left}
      />
      <div
        ref={scrollRef}
        className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-0.5 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage, WebkitMaskImage: maskImage }}
      >
        {chapters.map((ch) => (
          <ChapterTab
            key={ch.chapter}
            chapter={ch}
            active={ch.chapter === activeChapter}
            isCurrent={ch.chapter === currentChapter}
            onClick={() => onPick(ch.chapter)}
          />
        ))}
      </div>
      <StripArrow
        direction="right"
        onClick={() => nudge(1)}
        hidden={!edges.right}
      />
    </div>
  )
}

function StripArrow({
  direction,
  onClick,
  hidden,
}: {
  direction: 'left' | 'right'
  onClick: () => void
  hidden: boolean
}) {
  const marginClass = direction === 'left' ? '-mr-3.5' : '-ml-3.5'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        direction === 'left' ? 'Chapitres précédents' : 'Chapitres suivants'
      }
      className={`z-[2] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(27,23,38,0.12)] bg-white text-text-light/70 shadow-[0_6px_16px_-8px_rgba(27,23,38,0.3)] transition-all hover:scale-105 hover:bg-[#fafaf7] hover:text-text ${marginClass} ${
        hidden ? 'pointer-events-none opacity-0' : ''
      }`}
    >
      {direction === 'left' ? (
        <ChevronLeft className="h-4 w-4" />
      ) : (
        <ChevronRight className="h-4 w-4" />
      )}
    </button>
  )
}

function ChapterTab({
  chapter,
  active,
  isCurrent,
  onClick,
}: {
  chapter: CampaignChapter
  active: boolean
  isCurrent: boolean
  onClick: () => void
}) {
  const meta = chapterMeta(chapter.chapter)
  const cleared = chapter.stages.filter((s) => s.status === 'cleared').length
  const total = chapter.stages.length
  const isLocked = chapter.stages.every((s) => s.status === 'locked')

  const style: CSSProperties = {
    ['--hue' as string]: String(meta.hue),
  }

  return (
    <button
      type="button"
      data-ch={chapter.chapter}
      onClick={onClick}
      style={style}
      className={`relative flex w-[232px] shrink-0 cursor-pointer snap-start items-center gap-3.5 rounded-[18px] border-[1.5px] px-4 py-4 text-left shadow-[0_2px_8px_rgba(27,23,38,0.04)] transition-all hover:-translate-y-0.5 ${
        active
          ? 'border-[hsl(var(--hue),70%,55%)] bg-white shadow-[0_10px_28px_-12px_hsl(var(--hue)_70%_50%_/_0.5)]'
          : isCurrent
            ? 'border-amber-300 bg-white'
            : 'border-[rgba(27,23,38,0.08)] bg-white'
      } ${isLocked ? 'opacity-60' : ''}`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-extrabold text-white ${
          isLocked ? 'bg-[#cbc6bd] shadow-none' : ''
        }`}
        style={{
          background: isLocked
            ? undefined
            : `linear-gradient(135deg, hsl(${meta.hue}, 75%, 58%), hsl(${meta.hue + 25}, 70%, 50%))`,
          boxShadow: isLocked
            ? undefined
            : `0 4px 12px hsl(${meta.hue}, 70%, 50%, 0.35)`,
        }}
      >
        {chapter.chapter}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-display text-[15px] font-bold leading-tight text-text">
          {meta.title}
        </span>
        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-text-light/60">
          {isLocked ? 'Verrouillé' : `${cleared}/${total}`}
        </span>
      </span>
      {isLocked && <Lock className="h-3.5 w-3.5 shrink-0 text-text-light/50" />}
      {isCurrent && !isLocked && (
        <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-[3px] ring-emerald-500/25" />
      )}
    </button>
  )
}

// ── Level card ──────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: renders every stage status variant (locked/current/boss/cleared) with its own styling branch
function LevelCard({
  stage,
  onOpen,
  battleCost,
}: {
  stage: CampaignStage
  onOpen: () => void
  battleCost: number
}) {
  const isLocked = stage.status === 'locked'
  const isCleared = stage.status === 'cleared'
  const isCurrent = stage.status === 'current'
  const isBoss = stage.isBoss

  const base =
    'group relative rounded-2xl border-[1.5px] p-4 transition-all min-h-[92px]'

  let stateClass =
    'border-[rgba(27,23,38,0.08)] bg-[#fafaf7] cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(27,23,38,0.22)]'
  if (isLocked) {
    stateClass =
      'border-dashed border-[rgba(27,23,38,0.12)] bg-[#f4f1ec] opacity-75 cursor-not-allowed'
  } else if (isCurrent) {
    stateClass =
      'border-amber-300 bg-gradient-to-br from-[#fffaf0] to-white shadow-[0_2px_0_rgba(245,158,11,0.1),0_16px_32px_-18px_rgba(245,158,11,0.35)] cursor-pointer hover:-translate-y-0.5'
  } else if (isBoss) {
    stateClass =
      'border-amber-400 bg-gradient-to-br from-[#fff7ed] to-white cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-16px_rgba(245,158,11,0.35)]'
  }

  const markIcon = isLocked ? (
    <Lock className="h-4 w-4" />
  ) : isBoss ? (
    <Crown className="h-4 w-4" />
  ) : isCurrent ? (
    <Star className="h-4 w-4 fill-current" />
  ) : (
    <Check className="h-4 w-4" />
  )

  const markColor = isLocked
    ? 'text-text-light/40'
    : isCurrent || isBoss
      ? 'text-amber-500'
      : 'text-emerald-600'

  return (
    <button
      type="button"
      onClick={() => {
        if (!isLocked) {
          onOpen()
        }
      }}
      disabled={isLocked}
      className={`${base} ${stateClass} text-left`}
    >
      <div className="flex items-center gap-2.5">
        <span className={markColor}>{markIcon}</span>
        <span
          className={`font-display text-[17px] font-extrabold ${
            isLocked ? 'text-text-light/50' : 'text-text'
          }`}
        >
          {stage.label}
          {isBoss ? ' · Boss' : ''}
        </span>
        {isCurrent && (
          <span className="ml-auto rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
            Actuel
          </span>
        )}
        {isLocked && (
          <span className="ml-auto rounded-full border border-[rgba(27,23,38,0.08)] bg-[rgba(27,23,38,0.05)] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-light/50">
            Verrou.
          </span>
        )}
      </div>

      {isBoss && !isLocked && (
        <div className="mt-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
          Boss · 1v3
        </div>
      )}

      {isCurrent && (
        <span className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-3 font-display text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(245,158,11,0.6)] transition-transform">
          <Swords className="h-4 w-4" />
          Combattre
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      )}

      {!isLocked && !isCurrent && (
        <div className="mt-3 flex items-center gap-3.5 font-mono text-[11px] text-text-light/60">
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3 text-amber-500" />
            {battleCost}
          </span>
        </div>
      )}

      {isCleared && (
        <span
          className="pointer-events-none absolute right-3.5 top-3.5 inline-flex translate-y-[-3px] items-center gap-1.5 rounded-full bg-[#1b1726] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-white opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden
        >
          <RotateCcw className="h-3 w-3" />
          Rejouer
        </span>
      )}
    </button>
  )
}

// ── Team dock ────────────────────────────────────────────────────────────────

function TeamDock({ team, onEdit }: { team: TeamUnit[]; onEdit: () => void }) {
  const total = team.reduce((acc, u) => acc + computePower(u.stats), 0)

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-3"
      style={{
        background: 'linear-gradient(180deg, rgba(251,248,243,0), #fbf8f3 38%)',
      }}
    >
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center gap-4 rounded-[20px] bg-[#1b1726] px-4 py-3 pl-5 text-white shadow-[0_18px_44px_-16px_rgba(27,23,38,0.5)]">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-amber-400" />
          <div>
            <div className="font-display text-base font-extrabold text-white">
              Mon équipe
            </div>
            <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
              <Zap className="h-3 w-3 text-amber-400" />
              <b className="tabular-nums text-[13px] text-amber-400">
                {fmt(total)}
              </b>
              <span>Puissance</span>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden gap-2 md:flex">
          {team.length === 0 ? (
            <span className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-white/60">
              Aucune carte
            </span>
          ) : (
            team.map((u) => (
              <MiniCard
                key={u.userCardId}
                unit={u}
                width="w-[52px]"
                showName={false}
              />
            ))
          )}
        </div>

        <div className="ml-auto flex gap-2 md:ml-0">
          <Button
            variant="secondary"
            onClick={onEdit}
            className="gap-2 bg-white text-[#1b1726] hover:bg-white/90 hover:text-[#1b1726] border-white/0"
          >
            <Settings className="h-4 w-4" />
            Modifier
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Mini card (used in dock + prep modal) ────────────────────────────────────
// Uses `TcgCardFace` for real card art + rarity frame. Width controls tile
// size; TcgCardFace fills its aspect-2/3 container. Rarity tone drives the
// level badge overlay so it inherits the card frame colours.
// When `showName` is false the family + name band are hidden and a power pill
// overlays the bottom instead — used by the dock where names would be noise.

function MiniCard({
  unit,
  width,
  showName = true,
}: {
  unit: TeamUnit
  width: string
  showName?: boolean
}) {
  const tone = getRarityTone(unit.rarity)
  const power = computePower(unit.stats)
  return (
    <div className={`relative aspect-[2/3] ${width}`}>
      <TcgCardFace
        rarity={unit.rarity}
        name={unit.cardName}
        setName=""
        imageUrl={unit.cardImageUrl}
        variant={unit.variant}
        isOwned
        compact
        showName={showName}
      />
      <div className="pointer-events-none absolute left-1.5 top-1.5 z-20">
        <div
          className="flex h-5 min-w-[20px] items-center justify-center rounded-[5px] border-[0.5px] border-white px-1 font-display text-[10px] font-extrabold leading-none text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
          style={{ background: tone.hex }}
        >
          {unit.level}
        </div>
      </div>
      {!showName && (
        <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-20 inline-flex items-center justify-center gap-0.5 rounded-md bg-[rgba(27,23,38,0.85)] px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums text-white">
          <Zap className="h-2.5 w-2.5 text-amber-400" />
          {fmt(power)}
        </div>
      )}
    </div>
  )
}

// ── Prep modal ──────────────────────────────────────────────────────────────

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: combat-prep modal composes opponents, rewards, power verdict and team preview in one view
function PrepModal({
  stage,
  chapter,
  team,
  currentPC,
  battleCost,
  sweepCost,
  canBattle,
  canSweep,
  sweepPending,
  onFight,
  onSweep,
  onEditTeam,
  onClose,
}: {
  stage: CampaignStage
  chapter: number
  team: TeamUnit[]
  currentPC: number
  battleCost: number
  sweepCost: number
  canBattle: boolean
  canSweep: boolean
  sweepPending: boolean
  onFight: () => void
  onSweep: () => void
  onEditTeam: () => void
  onClose: () => void
}) {
  const meta = chapterMeta(chapter)
  const isBoss = stage.isBoss
  const totalPower = team.reduce((acc, u) => acc + computePower(u.stats), 0)
  const recPower = stage.recommendedPower
  const ratio = recPower === 0 ? 1 : totalPower / recPower
  const tone: 'good' | 'ok' | 'low' =
    ratio >= 1.05 ? 'good' : ratio >= 0.9 ? 'ok' : 'low'
  const verdictLabel =
    tone === 'good' ? 'Avantage' : tone === 'ok' ? 'Équilibré' : 'Risqué'
  const rp = stage.rewardPreview
  const loot = stage.status !== 'cleared' ? rp.firstClear : rp.farm
  // Fight button label reflects why it's disabled: no team takes priority over
  // energy so we never tell the player "énergie insuffisante" when the real
  // blocker is an empty team.
  const fightLabel = team.length
    ? currentPC < battleCost
      ? 'Énergie insuffisante'
      : 'Combattre'
    : 'Équipe requise'
  // Sub-1% chances (ex. cardChance 0.005) : une décimale pour ne pas afficher
  // « 1% » (le double) ni masquer la pastille en arrondissant à 0.
  const fmtPct = (frac: number) => {
    const pct = frac * 100
    return pct > 0 && pct < 1 ? pct.toFixed(1) : String(Math.round(pct))
  }
  const equipPct = rp.farmEquipmentChance * 100
  const cardPct = rp.farmCardChance * 100

  return (
    <>
      {/* Header — just the eyebrow, no redundant title. */}
      <PopupHeader>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-text-light/60">
          {isBoss ? 'Combat de boss' : 'Préparation'} · Niveau {stage.label}
          {isBoss ? ` · ${meta.title}` : ''}
        </p>
      </PopupHeader>

      {/* Scrollable body — header/footer stay pinned outside the scroll. */}
      <PopupBody className="min-h-0 space-y-4 overflow-y-auto bg-transparent">
        {/* Grid: opponents + rewards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.3fr_1fr]">
          {/* Opponents block */}
          <div className="rounded-2xl border border-[rgba(27,23,38,0.06)] bg-white p-4">
            <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              <Swords className="h-3 w-3 text-amber-600" />
              Adversaires · {isBoss ? 'Boss 1v3' : '1v3'}
            </div>
            <div
              className={`flex flex-wrap justify-center gap-2.5 ${
                isBoss ? 'py-1' : ''
              }`}
            >
              {stage.enemies.map((enemy) => (
                <EnemyCard
                  key={enemy.id}
                  boss={isBoss}
                  power={Math.round(recPower / stage.enemies.length)}
                  width={isBoss ? 'w-[110px]' : 'w-[74px]'}
                  imageUrl={enemy.imageUrl}
                />
              ))}
            </div>
          </div>

          {/* Rewards + energy block */}
          <div className="rounded-2xl border border-[rgba(27,23,38,0.06)] bg-white p-4">
            <div className="mb-3 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              <Sparkles className="h-3 w-3 text-amber-600" />
              Récompenses
            </div>
            <div className="flex flex-wrap gap-2">
              <RewardPill
                color="#f59e0b"
                label={`${loot.gold} Or`}
                icon={Coins}
              />
              <RewardPill
                color="#8b5cf6"
                label={`${loot.dust} Poussière`}
                icon={Sparkles}
              />
              <RewardPill color="#3b82f6" label={`${loot.xp} XP`} icon={Star} />
              {equipPct > 0 && (
                <RewardPill
                  color="#ec4899"
                  label={`Drop équipement ${fmtPct(rp.farmEquipmentChance)}%`}
                  icon={Shield}
                />
              )}
              {cardPct > 0 && (
                <RewardPill
                  color="#10b981"
                  label={`Drop carte ${fmtPct(rp.farmCardChance)}%`}
                  icon={Layers}
                />
              )}
              {stage.status !== 'cleared' && rp.guaranteedEquipment && (
                <RewardPill
                  color="#ec4899"
                  label="Équipement garanti"
                  icon={Shield}
                />
              )}
              {stage.status !== 'cleared' && rp.guaranteedCard && (
                <RewardPill
                  color="#10b981"
                  label="Carte garantie"
                  icon={Layers}
                />
              )}
            </div>
            <div className="mt-3.5 flex items-center gap-2 border-t border-[rgba(27,23,38,0.07)] pt-3.5">
              <Zap className="h-4 w-4 text-violet-500" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-text-light/60">
                Coût
              </span>
              <b className="font-display text-xl font-extrabold text-text">
                {battleCost}
              </b>
              <span className="ml-auto font-mono text-[11px] text-text-light/50">
                énergie {currentPC}
              </span>
            </div>
          </div>
        </div>

        {/* Power verdict */}
        <PowerVerdict
          mine={totalPower}
          rec={recPower}
          tone={tone}
          label={verdictLabel}
          ratio={ratio}
        />

        {/* Team preview */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-text-light/60">
              Ton équipe
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose()
                onEditTeam()
              }}
              className="gap-1"
            >
              <Settings className="h-3 w-3" />
              Modifier
            </Button>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {team.length === 0 ? (
              <p className="text-sm text-text-light">
                Aucune carte. Configure ton équipe avant de combattre.
              </p>
            ) : (
              team.map((u) => (
                <MiniCard
                  key={u.userCardId}
                  unit={u}
                  width="w-[80px]"
                  showName={false}
                />
              ))
            )}
          </div>
        </div>
      </PopupBody>

      {/* Footer — pinned below the scroll area, always visible. */}
      <PopupFooter className="justify-stretch gap-3">
        <Button variant="outline" size="lg" onClick={onClose}>
          Retour
        </Button>
        {stage.status === 'cleared' && (
          <Button
            variant="outline"
            size="lg"
            onClick={onSweep}
            disabled={!canSweep || sweepPending}
            className="gap-2"
            title={
              canSweep
                ? `Farm × 3 (${sweepCost * 3} PC)`
                : `Coût : ${sweepCost * 3} PC`
            }
          >
            <Zap className="h-4 w-4 text-amber-500" />
            Farm ×3
          </Button>
        )}
        <Button
          size="lg"
          onClick={onFight}
          disabled={!canBattle}
          className="flex-1 gap-2"
        >
          <Swords className="h-4 w-4" />
          {fightLabel}
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-black/15 px-2 py-0.5 font-mono text-[12px] font-bold tabular-nums">
            <Zap className="h-3 w-3" />
            {battleCost}
          </span>
        </Button>
      </PopupFooter>
    </>
  )
}

// Enemy card in the prep modal — same visual language as ally cards
// (TcgCardFace, no name band, power pill at the bottom). Portrait comes from the
// stage's enemy appearances (MinIO); falls back to the placeholder when null.
// A rose rarity tone distinguishes them from allies.
function EnemyCard({
  boss,
  power,
  width,
  imageUrl,
}: {
  boss: boolean
  power: number
  width: string
  imageUrl: string | null
}) {
  const rarity = boss ? 'LEGENDARY' : 'EPIC'
  return (
    <div className={`relative aspect-[2/3] ${width}`}>
      <TcgCardFace
        rarity={rarity}
        name=""
        setName=""
        imageUrl={imageUrl}
        variant="NORMAL"
        isOwned
        compact
        showName={false}
      />
      <div className="pointer-events-none absolute inset-x-1.5 bottom-1.5 z-20 inline-flex items-center justify-center gap-0.5 rounded-md bg-[rgba(27,23,38,0.85)] px-1 py-0.5 font-mono text-[9px] font-bold tabular-nums text-white">
        <Zap className="h-2.5 w-2.5 text-amber-400" />
        {fmt(power)}
      </div>
    </div>
  )
}

function RewardPill({
  color,
  label,
  icon: Icon = Sparkles,
}: {
  color: string
  label: string
  icon?: LucideIcon
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 font-mono text-[12px] font-bold"
      style={{
        background: `${color}1f`,
        color,
      }}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

function PowerVerdict({
  mine,
  rec,
  tone,
  label,
  ratio,
}: {
  mine: number
  rec: number
  tone: 'good' | 'ok' | 'low'
  label: string
  ratio: number
}) {
  const bg = tone === 'good' ? '#f0fdf4' : tone === 'ok' ? '#fffbeb' : '#fef2f2'
  const border =
    tone === 'good' ? '#bbf7d0' : tone === 'ok' ? '#fde68a' : '#fecaca'
  const mineColor =
    tone === 'good' ? '#16a34a' : tone === 'ok' ? '#d97706' : '#dc2626'
  const barGradient =
    tone === 'good'
      ? 'linear-gradient(90deg, #22c55e, #16a34a)'
      : tone === 'ok'
        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
        : 'linear-gradient(90deg, #ef4444, #dc2626)'
  const clampedPct = Math.min(100, Math.round(ratio * 100))

  return (
    <div
      className="my-4 rounded-2xl border p-4"
      style={{ background: bg, borderColor: border }}
    >
      <div className="flex items-baseline justify-center gap-3.5">
        <span
          className="font-display text-3xl font-extrabold tabular-nums"
          style={{ color: mineColor }}
        >
          {fmt(mine)}
        </span>
        <span className="font-mono text-xs uppercase tracking-[0.1em] text-text-light/40">
          vs
        </span>
        <span className="font-display text-2xl font-extrabold tabular-nums text-text-light/45">
          {fmt(rec)}
        </span>
      </div>
      <div className="my-2.5 h-2 overflow-hidden rounded-[4px] bg-[rgba(27,23,38,0.1)]">
        <div
          style={{
            width: `${clampedPct}%`,
            background: barGradient,
            height: '100%',
          }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-light/60">
        <span>Ta puissance</span>
        <span className="font-bold" style={{ color: mineColor }}>
          {label}
        </span>
        <span>Recommandé</span>
      </div>
    </div>
  )
}
