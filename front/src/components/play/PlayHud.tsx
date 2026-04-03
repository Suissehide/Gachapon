import {
  Coins,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

import { useQuests } from '../../queries/useLeaderboard.ts'
import { useUserProfile } from '../../queries/useProfile.ts'
import { useStreakSummary } from '../../queries/useStreak.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'

export function PlayHud() {
  const [visible, setVisible] = useState(true)
  const username = useAuthStore((s) => s.user?.username ?? '')

  const { data: streak } = useStreakSummary()
  const { data: profile } = useUserProfile(username)
  const { data: questsData } = useQuests()

  const quests = questsData?.quests ?? []

  // Streak cycle progress (30-day repeating)
  const streakDays = streak?.streakDays ?? 0
  const cycleDay = streakDays === 0 ? 0 : ((streakDays - 1) % 30) + 1

  // XP progress within current level
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const xpStart = (level - 1) ** 2 * 100
  const xpNext = level ** 2 * 100
  const xpProgress =
    xpNext === xpStart ? 1 : (xp - xpStart) / (xpNext - xpStart)

  return (
    <div className="fixed left-3 top-20 bottom-4 z-20 flex flex-col items-start gap-2 pointer-events-none">
      <Button
        variant="outline"
        size="icon-sm"
        className="pointer-events-auto shrink-0"
        onClick={() => setVisible((v) => !v)}
        title={visible ? 'Cacher le HUD' : 'Afficher le HUD'}
      >
        {visible ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
      </Button>

      {visible && (
        <div className="pointer-events-auto w-52 flex flex-col rounded-xl overflow-hidden bg-white/80 backdrop-blur-sm border border-border shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
          {/* ── Streak ── */}
          <div className="px-3 py-2.5 border-b border-border">
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
          </div>

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
            <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-400 transition-all duration-500"
                style={{
                  width: `${Math.max(0, Math.min(1, xpProgress)) * 100}%`,
                }}
              />
            </div>
            <div className="mt-0.5 flex justify-between">
              <span className="text-[8px] text-text-light/30">
                {xp - xpStart} XP
              </span>
              <span className="text-[8px] text-text-light/30">
                {xpNext - xpStart} XP
              </span>
            </div>
          </div>

          {/* ── Quests ── */}
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="h-3.5 w-3.5 text-accent" />
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-text-light">
                Missions
              </span>
            </div>

            {quests.length === 0 ? (
              <p className="text-[10px] text-text-light/40 italic">
                Aucune mission active.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {quests.slice(0, 4).map((quest) => (
                  <div
                    key={quest.id}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="text-[10px] font-medium text-text leading-snug min-w-0 truncate">
                      {quest.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {quest.rewardTokens > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Coins className="h-2.5 w-2.5 text-yellow-400" />
                          <span className="text-[9px] font-semibold tabular-nums text-text-light/70">
                            {quest.rewardTokens}
                          </span>
                        </span>
                      )}
                      {quest.rewardDust > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Sparkles className="h-2.5 w-2.5 text-sky-400" />
                          <span className="text-[9px] font-semibold tabular-nums text-text-light/70">
                            {quest.rewardDust}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
