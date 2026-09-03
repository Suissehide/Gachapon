import type { LucideIcon } from 'lucide-react'
import { Settings, Sparkles, Swords, Zap } from 'lucide-react'
import type { ReactNode } from 'react'

import type { TeamUnit } from '../../api/combat.api.ts'
import type { CardElement } from '../../constants/card.constant.ts'
import { computePower } from '../../utils/cardStats.ts'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { PopupBody, PopupFooter, PopupHeader } from '../ui/popup.tsx'
import { MiniCard } from './MiniCard.tsx'

function fmt(n: number): string {
  return n.toLocaleString('fr-FR')
}

export type PrepEnemy = {
  id: string
  imageUrl: string | null
  power: number
  element: string | null
}

/**
 * Écran d'avant-combat, partagé par la campagne et les tours.
 *
 * Les deux montrent exactement la même chose — adversaires, verdict de
 * puissance, aperçu d'équipe, coût en énergie — et ne divergent que sur trois
 * points, qui sont donc des emplacements : le fil d'ariane de l'en-tête
 * (`eyebrow`), les pastilles de récompense (`rewards`, absentes en tour faute
 * d'aperçu de butin côté serveur) et les actions supplémentaires du pied de
 * page (`extraActions`, le balayage de campagne).
 */
export function BattlePrepModal({
  eyebrow,
  enemies,
  isBoss = false,
  recommendedPower,
  team,
  currentPC,
  battleCost,
  rewards,
  extraActions,
  fightLabel,
  canFight,
  onFight,
  onEditTeam,
  onClose,
}: {
  eyebrow: ReactNode
  enemies: PrepEnemy[]
  isBoss?: boolean
  recommendedPower: number
  team: TeamUnit[]
  currentPC: number
  battleCost: number
  rewards?: ReactNode
  extraActions?: ReactNode
  fightLabel: string
  canFight: boolean
  onFight: () => void
  onEditTeam: () => void
  onClose: () => void
}) {
  const totalPower = team.reduce((acc, u) => acc + computePower(u.stats), 0)
  const ratio = recommendedPower === 0 ? 1 : totalPower / recommendedPower
  const tone: 'good' | 'ok' | 'low' =
    ratio >= 1.05 ? 'good' : ratio >= 0.9 ? 'ok' : 'low'
  const verdictLabel =
    tone === 'good' ? 'Avantage' : tone === 'ok' ? 'Équilibré' : 'Risqué'

  return (
    <>
      <PopupHeader>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-text-light/60">
          {eyebrow}
        </p>
      </PopupHeader>

      <PopupBody className="min-h-0 space-y-4 overflow-y-auto bg-transparent">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.3fr_1fr]">
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
              {enemies.map((enemy) => (
                <EnemyCard
                  key={enemy.id}
                  boss={isBoss}
                  power={enemy.power}
                  width={isBoss ? 'w-[110px]' : 'w-[74px]'}
                  imageUrl={enemy.imageUrl}
                  element={enemy.element}
                />
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[rgba(27,23,38,0.06)] bg-white p-4">
            {rewards}
            <div
              className={`flex items-center gap-2 ${
                rewards
                  ? 'mt-3.5 border-t border-[rgba(27,23,38,0.07)] pt-3.5'
                  : ''
              }`}
            >
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

        <PowerVerdict
          mine={totalPower}
          rec={recommendedPower}
          tone={tone}
          label={verdictLabel}
          ratio={ratio}
        />

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

      <PopupFooter className="justify-stretch gap-3">
        <Button variant="outline" size="lg" onClick={onClose}>
          Retour
        </Button>
        {extraActions}
        <Button
          size="lg"
          onClick={onFight}
          disabled={!canFight}
          className="flex-1 gap-2"
        >
          <Swords className="h-4 w-4" />
          {fightLabel}
        </Button>
      </PopupFooter>
    </>
  )
}

export function EnemyCard({
  boss,
  power,
  width,
  imageUrl,
  element,
}: {
  boss: boolean
  power: number
  width: string
  imageUrl: string | null
  element: string | null
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
        element={(element ?? null) as CardElement | null}
      />
      <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1 rounded-sm border-[0.5px] border-white bg-[#1b1726]/92 px-2 py-[3px] font-display text-[10px] font-extrabold leading-none tabular-nums text-white shadow-[0_2px_6px_rgba(27,23,38,0.45)]">
        <Swords className="h-2.5 w-2.5 text-primary" />
        {fmt(power)}
      </div>
    </div>
  )
}

export function RewardPill({
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
