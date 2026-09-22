import {
  Coins,
  Crosshair,
  Droplets,
  Flame,
  Heart,
  Loader2,
  Lock,
  Shield,
  Sparkles,
  Star,
  Sword,
  Swords,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Card, CardVariant } from '../../constants/card.constant'
import { PASSIVE_LABELS } from '../../constants/passives.constant'
import i18n, { currentLocale } from '../../i18n/index.ts'
import { formatNumber } from '../../libs/utils.ts'
import { useAscendCard } from '../../queries/useAscendCard'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig'
import {
  useCardClassicStatsWithSetBonuses,
  useCardStuffStats,
} from '../../queries/useEquipment'
import { useLevelUpCard } from '../../queries/useLevelUpCard'
import { useSkillTree } from '../../queries/useSkills.ts'
import { useAuthStore } from '../../stores/auth.store'
import {
  computePower,
  displayStatBases,
  dustCostNextLevel,
  finalSpeed,
  finalStatWithBonuses,
  goldCostNextLevel,
  isAtTopOfPalier,
  maxLevelInPalier,
  statColorVar,
} from '../../utils/cardStats'
import { Button } from '../ui/button'

type Props = {
  userCardId: string
  card: Card
  variant: CardVariant
  quantity: number
  level: number
  palier: number
}

export function CombatPanel({
  userCardId,
  card,
  variant,
  quantity,
  level,
  palier,
}: Props) {
  const { t } = useTranslation(['collection', 'common'])
  const locale = currentLocale()
  const user = useAuthStore((s) => s.user)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { data: skillState } = useSkillTree()
  const dustDiscount = skillState?.effects?.upgradeDustDiscount ?? 0

  const levelUp = useLevelUpCard()
  const ascend = useAscendCard()
  const [working, setWorking] = useState(false)

  const palierMax = maxLevelInPalier(palier)
  const atTop = isAtTopOfPalier(level, palier)
  const atMaxPalier = palier >= economy.card.maxPalier
  const goldCost = atTop
    ? 0
    : goldCostNextLevel(level, card.rarity, economy.card)
  const dustCost = atTop
    ? 0
    : Math.max(
        0,
        Math.round(
          dustCostNextLevel(level, card.rarity, economy.card) *
            (1 - dustDiscount / 100),
        ),
      )
  const goldOk = (user?.gold ?? 0) >= goldCost
  const dustOk = (user?.dust ?? 0) >= dustCost
  const canLevel = !atTop && goldOk && dustOk
  const canAscend = atTop && !atMaxPalier && quantity > 1

  const passive = card.passiveKey ? PASSIVE_LABELS[card.passiveKey] : null

  // Bonus de set (2/4 pièces) inclus, pas seulement catalogue+substats — la
  // fiche de carte doit afficher les mêmes stats que le combat réel
  // (equipped-card-stats.ts, back).
  const classicBonuses = useCardClassicStatsWithSetBonuses(userCardId)
  const stuffStats = useCardStuffStats(userCardId)
  const hp = Math.round(
    finalStatWithBonuses(
      card.baseHp,
      level,
      variant,
      palier,
      classicBonuses.hp,
    ),
  )
  const atk = Math.round(
    finalStatWithBonuses(
      card.baseAtk,
      level,
      variant,
      palier,
      classicBonuses.atk,
    ),
  )
  const def = Math.round(
    finalStatWithBonuses(
      card.baseDef,
      level,
      variant,
      palier,
      classicBonuses.def,
    ),
  )
  const spd = Math.round(finalSpeed(card.baseSpd, classicBonuses.spd))
  const power = computePower({ hp, atk, def, spd })

  // Part propre à la CARTE (niveau, variante, palier), équipement exclu. Au
  // survol de la grille, chaque tuile se scinde en « base + apport » : le
  // joueur voit ce qu'il doit à son stuff et ce qu'il garde en le retirant.
  // La bascule est en CSS (`group-hover`) et non en état React : un `<div>`
  // porteur de onMouseEnter serait un élément statique rendu interactif.
  const bases = displayStatBases(card, level, variant, palier)

  const onLevelUp = async () => {
    setWorking(true)
    try {
      await levelUp.mutateAsync({ userCardId, targetLevel: level + 1 })
      await fetchMe()
    } finally {
      setWorking(false)
    }
  }

  const onAscend = async () => {
    setWorking(true)
    try {
      await ascend.mutateAsync({ userCardId })
      await fetchMe()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      {/* Combat header + level */}
      <div className="mt-[18px]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
            {t('collection:combatPanel.sectionTitle')}
          </span>
          <span className="whitespace-nowrap rounded-full border border-[#fcd34d] bg-[#fff7ed] px-[11px] py-1 font-mono text-[11px] font-bold tracking-[0.08em] text-[#d97706]">
            {t('collection:combatPanel.palierBadge', { palier })}
          </span>
        </div>
        <div className="mt-1.5 font-display text-[26px] font-extrabold leading-none -tracking-[0.01em] text-text">
          {t('collection:combatPanel.levelLabel')}{' '}
          <span
            key={level}
            className="inline-block animate-[cardStatPop_0.55s_cubic-bezier(0.25,1.6,0.4,1)]"
          >
            {level}
          </span>{' '}
          <span className="font-bold text-[rgba(27,23,38,0.4)]">
            / {palierMax}
          </span>
        </div>
      </div>

      {/* Puissance (équipement inclus) */}
      <div className="mt-[18px] flex items-center justify-between rounded-[14px] border border-[#fcd34d] bg-[#fff7ed] px-4 py-3.5">
        <span className="inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[#d97706]">
          <Swords className="h-4 w-4" />
          {t('collection:combatPanel.power')}
        </span>
        <span className="font-display text-[22px] font-extrabold tabular-nums text-[#d97706]">
          {formatNumber(power, locale)}
        </span>
      </div>

      {/* Stat grid — accents pris dans `statColorVar`, la même table que
          l'apport total de l'équipement juste en dessous : les teintes en dur
          avaient divergé sur les 4 stats de stuff. */}
      <div className="group mt-[18px] grid grid-cols-2 gap-2.5">
        <StatTile
          icon={<Heart className="h-4 w-4" />}
          label={t('common:stats.hp')}
          value={hp}
          base={bases.pv}
          accent={statColorVar('hp')}
        />
        <StatTile
          icon={<Sword className="h-4 w-4" />}
          label={t('common:stats.atk')}
          value={atk}
          base={bases.atq}
          accent={statColorVar('atk')}
        />
        <StatTile
          icon={<Shield className="h-4 w-4" />}
          label={t('common:stats.def')}
          value={def}
          base={bases.def}
          accent={statColorVar('def')}
        />
        <StatTile
          icon={<Zap className="h-4 w-4" />}
          label={t('common:stats.spd')}
          value={spd}
          base={bases.vit}
          accent={statColorVar('spd')}
        />
        <StatTile
          icon={<Target className="h-4 w-4" />}
          label={t('common:stats.critRate')}
          value={stuffStats.critRate}
          base={economy.combat.baseCritRate}
          suffix="%"
          accent={statColorVar('critRate')}
        />
        <StatTile
          icon={<Flame className="h-4 w-4" />}
          label={t('common:stats.critDmg')}
          value={stuffStats.critDmg}
          base={economy.combat.baseCritDmg}
          suffix="%"
          accent={statColorVar('critDmg')}
        />
        <StatTile
          icon={<Crosshair className="h-4 w-4" />}
          label={t('common:stats.armorPenShort')}
          value={stuffStats.armorPen}
          base={economy.combat.baseArmorPen}
          suffix="%"
          accent={statColorVar('armorPen')}
        />
        <StatTile
          icon={<Droplets className="h-4 w-4" />}
          label={t('common:stats.lifesteal')}
          value={stuffStats.lifesteal}
          base={economy.combat.baseLifesteal}
          suffix="%"
          accent={statColorVar('lifesteal')}
        />
      </div>

      {/* Level-up button */}
      {!atTop && (
        <LevelUpAction
          working={working}
          canLevel={canLevel}
          goldCost={goldCost}
          dustCost={dustCost}
          goldOk={goldOk}
          dustOk={dustOk}
          onLevelUp={onLevelUp}
        />
      )}

      {/* Ascend */}
      {atTop && !atMaxPalier && (
        <div className="mt-4">
          <Button
            variant="outline"
            onClick={onAscend}
            disabled={!canAscend || working}
            className="h-auto w-full justify-center rounded-[14px] border-[#fcd34d] bg-[#fff7ed] px-[18px] py-[15px] text-[15.5px] font-bold text-[#d97706] hover:bg-[#fef3c7] hover:text-[#d97706] disabled:cursor-not-allowed disabled:border-[rgba(27,23,38,0.08)] disabled:bg-[#eceae4] disabled:text-[rgba(27,23,38,0.45)] disabled:opacity-100"
          >
            <Star className="h-[17px] w-[17px]" />
            {working
              ? t('collection:combatPanel.ascendPending')
              : t('collection:combatPanel.ascend')}
          </Button>
          {!canAscend && quantity <= 1 && (
            <div className="mt-2.5 flex items-center gap-[7px] px-0.5 text-[13px] font-semibold text-[#dc2626]">
              <Lock className="h-[13px] w-[13px] flex-shrink-0" />
              {t('collection:combatPanel.duplicateRequired')}
            </div>
          )}
        </div>
      )}

      {atMaxPalier && atTop && (
        <div className="mt-4 rounded-[14px] border border-[#fcd34d] bg-[#fff7ed] px-4 py-3 text-center text-[13px] font-semibold text-[#d97706]">
          {t('collection:combatPanel.maxReached')}
        </div>
      )}

      {/* Passive */}
      {passive && (
        <div className="mt-4 rounded-[14px] border border-[rgba(27,23,38,0.06)] bg-surface-2 px-4 py-3">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
            <Sparkles className="h-3 w-3" />{' '}
            {t('collection:combatPanel.passiveLabel')}
          </p>
          <p className="mt-1 text-sm font-bold text-text">{passive.name}</p>
          <p className="mt-0.5 text-[12px] text-text-light">
            {passive.describe(palier)}
          </p>
        </div>
      )}
    </>
  )
}

function StatTile({
  icon,
  label,
  value,
  base,
  accent,
  suffix,
}: {
  icon: ReactNode
  label: string
  value: number
  /** Valeur hors équipement. Sert la lecture « base + apport » au survol. */
  base?: number
  accent: string
  suffix?: string
}) {
  const locale = currentLocale()
  // Toute valeur de stat est entière depuis l'arrondi à la source.
  const total = Math.round(value)
  const socle = base === undefined ? total : Math.round(base)
  const apport = total - socle
  // On ne scinde que s'il y a un apport : « 250 + 0 » n'apprend rien, et une
  // carte sans équipement garderait une ligne bruyante.
  const scindable = apport !== 0

  // Nom en haut, valeur en dessous et alignée à GAUCHE : au survol, l'apport
  // s'ajoute à droite du nombre au lieu de pousser toute la ligne, le socle
  // gardant le plus souvent le nombre de chiffres du total (tabular-nums).
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-[rgba(27,23,38,0.06)] bg-surface-2 px-4 py-3">
      <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[rgba(27,23,38,0.5)]">
        <span className="flex" style={{ color: accent }}>
          {icon}
        </span>
        {label}
      </span>
      <span className="font-display text-[22px] font-extrabold leading-none tabular-nums text-text">
        <span className={scindable ? 'group-hover:hidden' : undefined}>
          {formatNumber(total, locale)}
          {suffix}
        </span>
        {scindable && (
          <span className="hidden group-hover:inline">
            {formatNumber(socle, locale)}
            {suffix}
            <span className="text-[16px]" style={{ color: accent }}>
              {' '}
              {apport > 0 ? '+' : '−'}
              {formatNumber(Math.abs(apport), locale)}
              {suffix}
            </span>
          </span>
        )}
      </span>
    </div>
  )
}

function CostItem({
  icon,
  value,
  ok,
}: {
  icon: ReactNode
  value: number
  ok: boolean
}) {
  return (
    <span
      className={
        ok
          ? 'inline-flex items-center gap-1'
          : 'inline-flex items-center gap-1 font-extrabold text-[#dc2626]'
      }
    >
      {icon} {value}
    </span>
  )
}

/**
 * Trois phrases complètes plutôt qu'une liste assemblée : « Pas assez » +
 * « d'or » / « de poussière » ne se recollait qu'en français — l'ordre des
 * compléments et l'élision ne se traduisent pas mot à mot.
 */
function missingResourcesKey(goldOk: boolean, dustOk: boolean): string | null {
  if (!goldOk && !dustOk) {
    return 'collection:combatPanel.missingBoth'
  }
  if (!goldOk) {
    return 'collection:combatPanel.missingGold'
  }
  if (!dustOk) {
    return 'collection:combatPanel.missingDust'
  }
  return null
}

function LevelUpAction({
  working,
  canLevel,
  goldCost,
  dustCost,
  goldOk,
  dustOk,
  onLevelUp,
}: {
  working: boolean
  canLevel: boolean
  goldCost: number
  dustCost: number
  goldOk: boolean
  dustOk: boolean
  onLevelUp: () => void
}) {
  const missingKey = missingResourcesKey(goldOk, dustOk)
  // Click feedback — replays the press animation on every click (bumping the
  // key remounts the animated node so the keyframe restarts from 0).
  const [pressKey, setPressKey] = useState(0)
  const handleClick = () => {
    setPressKey((k) => k + 1)
    onLevelUp()
  }
  return (
    <div className="mt-4">
      <Button
        key={pressKey}
        onClick={handleClick}
        disabled={!canLevel || working}
        className={`h-auto w-full justify-between rounded-[14px] bg-gradient-to-br from-[#f59e0b] to-[#f97316] px-[18px] py-[15px] text-[15.5px] font-bold text-white shadow-[0_12px_26px_-10px_rgba(245,158,11,0.55)] hover:-translate-y-[1px] hover:from-[#f59e0b] hover:to-[#f97316] hover:shadow-[0_12px_26px_-10px_rgba(245,158,11,0.55)] active:scale-[0.98] disabled:cursor-not-allowed disabled:border disabled:border-[rgba(27,23,38,0.08)] disabled:bg-[#eceae4] disabled:bg-none disabled:text-[rgba(27,23,38,0.45)] disabled:opacity-100 disabled:shadow-none ${
          pressKey > 0 ? 'animate-[cardLevelUpPress_0.32s_ease]' : ''
        }`}
      >
        <span className="inline-flex items-center gap-[9px]">
          {working ? (
            <Loader2 className="h-[17px] w-[17px] animate-spin" />
          ) : (
            <TrendingUp className="h-[17px] w-[17px]" />
          )}
          {working
            ? i18n.t('collection:combatPanel.levelUpPending')
            : i18n.t('collection:combatPanel.levelUp')}
        </span>
        <span
          className={
            canLevel
              ? 'inline-flex items-center gap-2 rounded-full bg-white/20 px-[11px] py-[5px] font-mono text-xs'
              : 'inline-flex items-center gap-2 rounded-full bg-[rgba(27,23,38,0.06)] px-[11px] py-[5px] font-mono text-xs'
          }
        >
          <CostItem
            icon={<Coins className="h-3 w-3" />}
            value={goldCost}
            ok={goldOk}
          />
          <CostItem
            icon={<Sparkles className="h-3 w-3" />}
            value={dustCost}
            ok={dustOk}
          />
        </span>
      </Button>
      {!canLevel && missingKey !== null && (
        <div className="mt-2.5 flex items-center gap-[7px] px-0.5 text-[13px] font-semibold text-[#dc2626]">
          <Lock className="h-[13px] w-[13px] flex-shrink-0" />
          {i18n.t(missingKey)}
        </div>
      )}
    </div>
  )
}
