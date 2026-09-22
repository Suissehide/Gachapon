import {
  ArrowUp,
  Coins,
  Flame,
  Layers,
  Sparkles,
  Star,
  Swords,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PendingReward } from '../../api/rewards.api.ts'
import { RARITY_FR, RARITY_HEX } from '../../constants/achievements.constant.ts'
import i18n from '../../i18n/index.ts'
import { cn } from '../../libs/utils.ts'
import { Nom, NotificationItem } from '../notifications/NotificationItem.tsx'
import { Button } from '../ui/button.tsx'
import { ClaimParticles } from './ClaimParticles.tsx'

interface RewardCardProps {
  reward: PendingReward
  onClaim: (id: string) => void
  isLoading: boolean
}

/** Tête (grasse) et détail (mots de liaison) du titre d'une ligne. */
function sourceParts(reward: PendingReward): {
  head: string
  detail?: string | null
} {
  switch (reward.source) {
    case 'STREAK': {
      const day = reward.streakMilestone?.day
      return {
        head: i18n.t('rewards:source.streak'),
        detail:
          day === undefined
            ? null
            : day === 0
              ? i18n.t('rewards:source.dailyConnection')
              : i18n.t('rewards:source.day', { day }),
      }
    }
    case 'ACHIEVEMENT':
      return {
        head: i18n.t('rewards:source.achievement'),
        detail: reward.sourceTitle,
      }
    case 'QUEST':
      return {
        head: i18n.t('rewards:source.quest'),
        detail: reward.sourceTitle,
      }
    case 'LEVEL_UP':
      return { head: i18n.t('rewards:source.levelUp') }
    case 'ADMIN':
      return { head: i18n.t('rewards:source.admin'), detail: reward.label }
    case 'RAID':
      return { head: reward.label ?? i18n.t('rewards:source.raid') }
    default:
      return { head: i18n.t('rewards:source.fallback') }
  }
}

/**
 * Le titre d'une ligne : la SOURCE en gras (comme un nom de joueur dans la
 * cloche), le détail en mots de liaison. « Succès · Premier tirage » se lit
 * comme « captain veut rejoindre Les Rouges » juste au-dessus.
 */
function sourceTitle(reward: PendingReward): ReactNode {
  const { head, detail } = sourceParts(reward)
  return (
    <>
      <Nom>{head}</Nom>
      {detail ? ` · ${detail}` : null}
    </>
  )
}

const SOURCE_ICON: Record<PendingReward['source'], ReactNode> = {
  STREAK: <Flame className="h-4 w-4" />,
  ACHIEVEMENT: <Trophy className="h-4 w-4" />,
  QUEST: <Zap className="h-4 w-4" />,
  LEVEL_UP: <ArrowUp className="h-4 w-4" />,
  ADMIN: <Star className="h-4 w-4" />,
  RAID: <Swords className="h-4 w-4" />,
}

/** Un montant dans le sous-titre : icône colorée, valeur, unité. */
function Amount({
  icon,
  value,
  unit,
  className,
}: {
  icon: ReactNode
  value: ReactNode
  unit: string
  className?: string
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {icon}
      <span className={cn('font-semibold tabular-nums text-text', className)}>
        {value}
      </span>
      {unit}
    </span>
  )
}

/** Les montants, séparés par des points médians comme dans la cloche. */
function amounts(reward: PendingReward): ReactNode {
  const parts: ReactNode[] = []
  const r = reward.reward
  if (r.tokens > 0) {
    parts.push(
      <Amount
        key="tokens"
        icon={<Ticket className="h-3 w-3 text-primary" />}
        value={r.tokens}
        unit={i18n.t(
          r.tokens > 1
            ? 'common:currency.tokens.plural'
            : 'common:currency.tokens.singular',
        )}
      />,
    )
  }
  if (r.dust > 0) {
    parts.push(
      <Amount
        key="dust"
        icon={<Sparkles className="h-3 w-3 text-accent" />}
        value={r.dust}
        unit={i18n.t('common:currency.dust.singular')}
      />,
    )
  }
  if (r.xp > 0) {
    parts.push(
      <Amount
        key="xp"
        icon={<Star className="h-3 w-3 text-yellow-400" />}
        value={r.xp}
        unit={i18n.t('common:currency.xp.singular')}
      />,
    )
  }
  if (r.gold > 0) {
    parts.push(
      <Amount
        key="gold"
        icon={<Coins className="h-3 w-3 text-yellow-400" />}
        value={r.gold}
        unit={i18n.t('common:currency.gold.singular')}
      />,
    )
  }
  if (r.cardRarity) {
    const color = RARITY_HEX[r.cardRarity]
    parts.push(
      <span key="card" className="inline-flex items-center gap-1">
        <Layers className="h-3 w-3" style={{ color }} />
        {i18n.t('rewards:card.prefix')}{' '}
        <span className="font-semibold" style={{ color }}>
          {RARITY_FR[r.cardRarity] ?? r.cardRarity}
        </span>
      </span>,
    )
  }
  // Le point médian entre deux montants vient du CSS : pas de clé d'index à
  // inventer pour un séparateur.
  return (
    <span className="inline-flex items-center gap-1.5 [&>*+*]:before:mr-1.5 [&>*+*]:before:content-['·']">
      {parts}
    </span>
  )
}

export function RewardCard({ reward, onClaim, isLoading }: RewardCardProps) {
  const { t } = useTranslation('rewards')
  const [burst, setBurst] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [burstOrigin, setBurstOrigin] = useState({ x: 0, y: 0 })
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleClaim = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setBurstOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      })
    }
    setBurst(true)
    setTimeout(() => setClaiming(true), 400)
    setTimeout(() => onClaim(reward.id), 400 + 300)
  }

  return (
    <NotificationItem
      icon={SOURCE_ICON[reward.source] ?? SOURCE_ICON.STREAK}
      title={sourceTitle(reward)}
      subtitle={amounts(reward)}
      // Un palier de streak n'est plus distingué : ni dégradé, ni halo, ni
      // bordure. Les montants plus élevés parlent d'eux-mêmes.
      className={cn('overflow-hidden', claiming && 'reward-claim')}
      actions={
        <div ref={buttonRef} className="shrink-0">
          <ClaimParticles
            burst={burst}
            originX={burstOrigin.x}
            originY={burstOrigin.y}
            hasTokens={reward.reward.tokens > 0}
            hasDust={reward.reward.dust > 0}
            hasXp={reward.reward.xp > 0}
            hasGold={reward.reward.gold > 0}
          />
          <Button size="sm" onClick={handleClaim} disabled={isLoading || burst}>
            {t('rewards:claim')}
          </Button>
        </div>
      }
    />
  )
}
