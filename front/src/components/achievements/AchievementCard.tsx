import { Award, Check, Coins, Lock, Sparkles, Star } from 'lucide-react'

import {
  type AchievementWithProgress,
  RARITY_FR,
  RARITY_HEX,
} from '../../constants/achievements.constant'

interface Props {
  achievement: AchievementWithProgress
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

export function AchievementCard({ achievement }: Props) {
  const pct = Math.min(
    100,
    Math.round((achievement.progress / Math.max(1, achievement.threshold)) * 100),
  )
  const done = achievement.unlocked
  const reward = achievement.reward

  return (
    <div
      className="group flex flex-col rounded-2xl border p-[18px] transition-[transform,box-shadow,border-color] duration-[250ms] hover:-translate-y-[3px] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={
        done
          ? {
              background: 'linear-gradient(160deg, #fffaf0, #fff)',
              borderColor: '#fcd34d',
              boxShadow:
                '0 2px 0 rgba(245,158,11,.08), 0 14px 30px -18px rgba(245,158,11,.3)',
            }
          : {
              background: '#fafaf7',
              borderColor: 'rgba(27,23,38,.07)',
            }
      }
    >
      {/* Top row : icon + name/status + percentage */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border"
          style={
            done
              ? {
                  background: 'linear-gradient(135deg, #fde68a, #f59e0b)',
                  color: '#fff',
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(245,158,11,.35)',
                }
              : {
                  background: '#f1efe9',
                  color: 'rgba(27,23,38,.4)',
                  borderColor: 'rgba(27,23,38,.05)',
                }
          }
        >
          {done ? <Award className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
        </div>

        <div className="min-w-0 flex-1 pt-px">
          <div
            className="truncate font-display text-[15px] font-bold leading-tight"
            style={{ color: '#1b1726' }}
            title={achievement.name}
          >
            {achievement.name}
          </div>
          <div
            className="mt-1 flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.14em]"
            style={{
              color: done ? '#16a34a' : 'rgba(27,23,38,.45)',
            }}
          >
            {done && <Check className="h-3 w-3" />}
            {done ? 'DÉBLOQUÉ' : 'À DÉBLOQUER'}
          </div>
        </div>

        <div
          className="shrink-0 font-display text-[30px] font-extrabold leading-none tabular-nums"
          style={{ color: done ? '#f59e0b' : 'rgba(27,23,38,.32)' }}
        >
          {pct}
          <span className="text-[15px]">%</span>
        </div>
      </div>

      {/* Description — min-height aligns rows of a grid */}
      <p
        className="mt-3.5 text-[13px] leading-[1.45] [min-height:38px]"
        style={{ color: 'rgba(27,23,38,.6)' }}
      >
        {achievement.description}
      </p>

      {/* Progress */}
      <div className="mt-2.5">
        <div
          className="h-[6px] overflow-hidden rounded-[3px]"
          style={{ background: 'rgba(27,23,38,.08)' }}
        >
          <div
            className="h-full rounded-[3px] transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              background: done
                ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                : 'linear-gradient(90deg, #f59e0b, #ec4899)',
            }}
          />
        </div>
        <div
          className="mt-1.5 text-right font-mono text-[11px] tabular-nums"
          style={{ color: 'rgba(27,23,38,.5)' }}
        >
          {fmt(Math.min(achievement.progress, achievement.threshold))} /{' '}
          {fmt(achievement.threshold)}
        </div>
      </div>

      {/* Rewards */}
      {reward && (
        <div
          className="mt-3.5 flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-3.5"
          style={{ borderTop: '1px solid rgba(27,23,38,.07)' }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[0.14em]"
            style={{ color: 'rgba(27,23,38,.45)' }}
          >
            RÉCOMPENSE
          </span>
          <div className="flex items-center gap-3.5">
            {reward.tokens > 0 && (
              <RewardChip
                icon={<Coins size={15} />}
                color="#f59e0b"
                value={reward.tokens}
              />
            )}
            {reward.dust > 0 && (
              <RewardChip
                icon={<Sparkles size={15} />}
                color="#8b5cf6"
                value={reward.dust}
              />
            )}
            {reward.xp > 0 && (
              <RewardChip
                icon={<Star size={15} />}
                color="#fbbf24"
                value={reward.xp}
                suffix="XP"
              />
            )}
          </div>
          {reward.cardRarity && (
            <div
              className="basis-full font-mono text-[11px] font-bold uppercase tracking-[0.06em]"
              style={{ color: RARITY_HEX[reward.cardRarity] ?? '#1b1726' }}
            >
              + Carte {RARITY_FR[reward.cardRarity] ?? reward.cardRarity}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RewardChip({
  icon,
  color,
  value,
  suffix,
}: {
  icon: React.ReactNode
  color: string
  value: number
  suffix?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[14px]"
      style={{ color }}
    >
      {icon}
      <b
        className="font-bold tabular-nums"
        style={{ color: '#1b1726', fontSize: 14 }}
      >
        {fmt(value)}
      </b>
      {suffix && (
        <span
          className="font-mono text-[9px] uppercase tracking-[0.1em]"
          style={{ color: 'rgba(27,23,38,.45)' }}
        >
          {suffix}
        </span>
      )}
    </span>
  )
}
