import {
  CheckCircle2,
  ChevronRight,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  Star,
  Trophy,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { DEFAULT_ECONOMY, useEconomyConfig } from '../../queries/useEconomyConfig.ts'
import { useUserProfile } from '../../queries/useProfile.ts'
import { useQuests } from '../../queries/useQuests.ts'
import { useStreakSummary } from '../../queries/useStreak.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { computeLevel, xpForLevel } from '../../utils/level.ts'
import { StreakSummaryModal } from '../streak/StreakSummaryModal.tsx'
import { Button } from '../ui/button.tsx'

export function PlayHud() {
  const [visible, setVisible] = useState(() => window.innerWidth >= 768)
  const [streakModalOpen, setStreakModalOpen] = useState(false)
  const navigate = useNavigate()
  const username = useAuthStore((s) => s.user?.username ?? '')

  const { data: streak } = useStreakSummary()
  const { data: profile } = useUserProfile(username)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { data: quests, isPending: questsLoading } = useQuests()

  // Streak cycle progress (30-day repeating)
  const streakDays = streak?.streakDays ?? 0
  const cycleDay = streakDays === 0 ? 0 : ((streakDays - 1) % 30) + 1

  // XP progress within current level
  const xp = profile?.xp ?? 0
  const level = computeLevel(xp, economy.xp)
  const isMaxLevel = level >= economy.xp.levelCap
  const xpStart = xpForLevel(level, economy.xp)
  const xpNext = xpForLevel(level + 1, economy.xp)
  const xpRange = xpNext - xpStart
  const xpInLevel = xp - xpStart
  const xpProgress = isMaxLevel
    ? 1
    : xpRange === 0
      ? 1
      : xpInLevel / xpRange
  const xpPercent = Math.max(0, Math.min(1, xpProgress)) * 100

  return (
    <>
      <div className="fixed left-3 top-[calc(var(--topbar-h)+1rem)] bottom-4 z-20 flex flex-col items-start gap-2 pointer-events-none">
        <Button
          variant="outline"
          size="icon-sm"
          className="pointer-events-auto shrink-0"
          onClick={() => setVisible((v) => !v)}
          title={visible ? 'Cacher le HUD' : 'Afficher le HUD'}
        >
          {visible ? (
            <PanelLeftClose size={13} />
          ) : (
            <PanelLeftOpen size={13} />
          )}
        </Button>

        {visible && (
          <div className="pointer-events-auto w-52 flex flex-col rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm border border-border shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
            {/* ── Streak ── */}
            <button
              type="button"
              className="group w-full cursor-pointer text-left px-3 py-2.5 border-b border-border hover:bg-white/60 transition-colors"
              onClick={() => setStreakModalOpen(true)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
                    Streak
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black tabular-nums text-primary">
                    {streakDays}
                  </span>
                  {streak?.bestStreak != null && streak.bestStreak > 0 && (
                    <div className="flex items-center gap-0.5 text-text-light/40">
                      <Trophy className="h-2.5 w-2.5 text-yellow-400/60" />
                      <span className="text-[9px] font-semibold tabular-nums">
                        {streak.bestStreak}
                      </span>
                    </div>
                  )}
                  <ChevronRight className="h-3 w-3 text-text-light/30 group-hover:text-text-light/60 transition-colors" />
                </div>
              </div>

              {/* 30-segment mini progress bar */}
              <div className="flex gap-px">
                {Array.from({ length: 30 }, (_, i) => {
                  const day = i + 1
                  let cls = 'h-1 flex-1 rounded-full '
                  if (cycleDay === 0 || day > cycleDay) {
                    cls += 'bg-border'
                  } else if (day === cycleDay) {
                    cls += 'bg-primary animate-pulse'
                  } else {
                    cls += 'bg-primary/50'
                  }
                  return <div key={day} className={cls} />
                })}
              </div>
              <div className="mt-0.5 flex justify-between">
                <span className="text-[8px] text-text-light/30">1</span>
                <span className="text-[8px] text-text-light/30">30</span>
              </div>
            </button>

            {/* ── Level / XP ── */}
            <div className="px-3 py-2.5 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-purple-400" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
                    Niveau
                  </span>
                </div>
                <span className="text-sm font-black tabular-nums text-text">
                  {level}
                </span>
              </div>

              {/* XP progress bar */}
              <div className="h-2 w-full rounded-full bg-border/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <div className="mt-0.5 text-right">
                <span className="text-[8px] font-medium tabular-nums text-text-light/40">
                  {isMaxLevel
                    ? 'MAX'
                    : `${xpRange - xpInLevel} XP avant niveau ${level + 1}`}
                </span>
              </div>
            </div>

            {/* ── Quests ── */}
            {!questsLoading && quests?.weekly && quests.weekly.length > 0 && (
              <button
                type="button"
                className="group w-full cursor-pointer text-left px-3 py-2.5 hover:bg-white/60 transition-colors"
                onClick={() => navigate({ to: '/quests' })}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
                      Quêtes
                    </span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-text-light/30 group-hover:text-text-light/60 transition-colors" />
                </div>

                <div className="space-y-1.5">
                  {quests.weekly.slice(0, 3).map((quest) => (
                    <div key={quest.key} className="flex items-center gap-2 text-[9px]">
                      {quest.completed ? (
                        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-text-light/30 flex-shrink-0" />
                      )}
                      <span
                        className={`truncate flex-1 ${
                          quest.completed
                            ? 'text-text-light/40 line-through'
                            : 'text-text-light'
                        }`}
                      >
                        {quest.name}
                      </span>
                      <span className="font-semibold tabular-nums text-text-light flex-shrink-0">
                        {quest.progress}/{quest.target}
                      </span>
                    </div>
                  ))}
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      <StreakSummaryModal
        open={streakModalOpen}
        onClose={() => setStreakModalOpen(false)}
      />
    </>
  )
}
