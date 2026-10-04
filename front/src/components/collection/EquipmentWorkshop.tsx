import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, Plus, Repeat, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type {
  EquipmentInstance,
  EquipmentMilestone,
  EquipmentSetDefinition,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import type { UserCard } from '../../constants/card.constant.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useToast } from '../../hooks/useToast.ts'
import i18n, { currentLocale } from '../../i18n/index.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn, formatNumber } from '../../libs/utils.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useEquipItem,
  useEquipmentList,
  useEquipmentSets,
  useSalvageItems,
  useSetColorByKey,
  useUnequipItem,
  useUpgradeItem,
} from '../../queries/useEquipment.ts'
import { useSkillTree } from '../../queries/useSkills.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import {
  activeSetsForCard,
  scaledBaseBonus,
  statColorVar,
} from '../../utils/cardStats.ts'
import {
  adviceFor,
  LAB_STATS,
  type LabContext,
  type LabStat,
  type LabTotals,
  labBase,
  labTotals,
  PCT_STATS,
  prioScore,
  togglePrio,
  withPiece,
} from '../../utils/equipWorkshop.ts'
import { ArcadeCard } from '../shared/ArcadeCard.tsx'
import { PageHeader } from '../shared/PageHeader.tsx'
import { TcgCardFace } from '../shared/tcg-card/TcgCardFace.tsx'
import { Button } from '../ui/button.tsx'
import { Card } from '../ui/card.tsx'
import { Label } from '../ui/label.tsx'
import { Switch } from '../ui/switch.tsx'
import { SLOT_ICONS, SLOT_LABELS, SLOT_ORDER } from './EquipmentSlotsPanel.tsx'

const STAT_LABEL: Record<LabStat, string> = {
  hp: i18n.t('common:stats.hp'),
  atk: i18n.t('common:stats.atk'),
  def: i18n.t('common:stats.def'),
  spd: i18n.t('common:stats.spd'),
  critRate: i18n.t('common:stats.critRate'),
  critDmg: i18n.t('common:stats.critDmgShort'),
  armorPen: i18n.t('common:stats.armorPenShort'),
  lifesteal: i18n.t('common:stats.lifesteal'),
}

// Même gabarit que `ArcadeCard` (rayon, bordure, ombre, padding) : les
// panneaux de l'atelier ont le rythme des autres pages.
const PANEL =
  'rounded-[22px] border-[rgba(27,23,38,0.06)] shadow-[0_2px_0_rgba(27,23,38,0.03),0_16px_36px_-20px_rgba(27,23,38,0.12)]'
const PANEL_PAD = 'p-[22px_24px] sm:p-[26px_28px_28px]'
const KICKER =
  'font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[rgba(27,23,38,0.45)]'
const ACT =
  'h-auto min-h-[42px] w-full whitespace-normal rounded-xl py-2 text-sm font-bold leading-tight'

// Clés stables des segments de jauge (un set demande 2, 3 ou 4 pièces).
const SEGMENT_KEYS = ['pc-1', 'pc-2', 'pc-3', 'pc-4']

function fmt(k: LabStat, v: number): string {
  const n = formatNumber(Math.round(v), currentLocale())
  return PCT_STATS.has(k) ? `${n} %` : n
}

/** `hpFlat` → `hp`, `critRatePct` → `critRate`. */
function bonusStat(key: string): LabStat {
  return key.replace(/Flat$|Pct$/, '') as LabStat
}

/** Libellé d'une ligne de bonus : `ATQ +12`, `ATQ +5 %`. */
function bonusText(key: string, value: number): string {
  const n = formatNumber(Math.round(value), currentLocale())
  return `${STAT_LABEL[bonusStat(key)] ?? key} +${n}${key.endsWith('Pct') ? ' %' : ''}`
}

/** Même règle que le serveur (`salvageGoldWithBonus`) : bonus par pièce puis arrondi. */
function salvageGold(
  items: { rarity: string }[],
  byRarity: Record<string, number>,
  bonusPct = 0,
): number {
  return items.reduce(
    (sum, i) =>
      sum + Math.round((byRarity[i.rarity] ?? 0) * (1 + bonusPct / 100)),
    0,
  )
}

function activeSetKeys(
  items: EquipmentInstance[],
  userCardId: string,
  defs: EquipmentSetDefinition[],
): string[] {
  const keys = items
    .filter((i) => i.equippedOnId === userCardId)
    .map((i) => i.setKey)
  return activeSetsForCard(keys, defs)
    .filter((s) => s.active)
    .map((s) => s.key)
}

/** Effet de set d'un changement, seulement s'il y en a un : activé, sinon cassé. */
function setEffect(
  curActive: string[],
  nextActive: string[],
  setDef: Map<string, EquipmentSetDefinition>,
): { up: boolean; def: EquipmentSetDefinition } | null {
  const gained = nextActive.find((k) => !curActive.includes(k))
  const lost = curActive.find((k) => !nextActive.includes(k))
  const def = setDef.get(gained ?? lost ?? '')
  return def ? { up: gained !== undefined, def } : null
}

function Delta({ v, k }: { v: number; k?: LabStat }) {
  if (Math.round(v) === 0) {
    return null
  }
  const abs = k
    ? fmt(k, Math.abs(v))
    : formatNumber(Math.abs(Math.round(v)), currentLocale())
  return (
    <span
      className={cn(
        'whitespace-nowrap font-mono text-xs font-bold tabular-nums',
        v > 0 ? 'text-[#15803d]' : 'text-[#be123c]',
      )}
    >
      {v > 0 ? '+' : '−'}
      {abs}
    </span>
  )
}

type Props = {
  userCard: UserCard
  slot: EquipmentSlot
  onSlotChange: (slot: EquipmentSlot) => void
}

export function EquipmentWorkshop({ userCard, slot, onSlotChange }: Props) {
  const { t } = useTranslation(['collection', 'common'])
  const { toast } = useToast()
  const locale = currentLocale()
  const { card } = userCard
  const { data: equip } = useEquipmentList()
  const { data: setsData } = useEquipmentSets()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const { data: skillState } = useSkillTree()
  const setColor = useSetColorByKey()
  const gold = useAuthStore((s) => s.user?.gold ?? 0)

  const equipItem = useEquipItem()
  const unequipItem = useUnequipItem()
  const upgradeItem = useUpgradeItem()
  const salvage = useSalvageItems()
  const busy =
    equipItem.isPending ||
    unequipItem.isPending ||
    upgradeItem.isPending ||
    salvage.isPending

  const advice = adviceFor(card)
  const [prio, setPrio] = useState<LabStat[]>(advice.prio)
  const [setFilter, setSetFilter] = useState<string[]>([])
  const [hideWornElsewhere, setHideWornElsewhere] = useState(false)
  const [selId, setSelId] = useState<string | null>(null)
  const [hovId, setHovId] = useState<string | null>(null)
  const [destroy, setDestroy] = useState(false)
  const [checked, setChecked] = useState<string[]>([])
  const [confirm, setConfirm] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)

  const items = equip?.items ?? []
  const setDefs = setsData?.sets ?? []
  const setDef = new Map<string, EquipmentSetDefinition>(
    setDefs.map((d) => [d.key, d]),
  )
  const ucId = userCard.id
  const backKey = `${card.id}-${userCard.variant}`

  const ctx: LabContext = {
    card,
    level: userCard.level,
    variant: userCard.variant,
    palier: userCard.palier,
    userCardId: ucId,
    levelScale: economy.equip.levelScale,
    setDefs,
    baseline: {
      critRate: economy.combat.baseCritRate,
      critDmg: economy.combat.baseCritDmg,
      armorPen: economy.combat.baseArmorPen,
      lifesteal: economy.combat.baseLifesteal,
    },
  }

  const cur = labTotals(items, ctx)
  const base = labBase(ctx)
  const curActive = activeSetKeys(items, ucId, setDefs)

  const bySlot = new Map(
    items.filter((i) => i.equippedOnId === ucId).map((i) => [i.slot, i]),
  )
  const slotItems = items.filter((i) => i.slot === slot)
  const rows = slotItems
    .filter((i) => setFilter.length === 0 || setFilter.includes(i.setKey))
    .filter(
      (i) =>
        !hideWornElsewhere ||
        i.equippedOnId === null ||
        i.equippedOnId === ucId,
    )
    .map((it) => {
      const simItems = withPiece(items, it, ucId)
      const next = labTotals(simItems, ctx)
      return {
        it,
        simItems,
        next,
        ds: it.equippedOnId === ucId ? 0 : prioScore(next, cur, prio),
      }
    })
    // La pièce portée ici d'abord, puis par gain.
    .sort(
      (a, b) =>
        Number(b.it.equippedOnId === ucId) -
          Number(a.it.equippedOnId === ucId) ||
        b.ds - a.ds ||
        b.next.power - a.next.power,
    )

  // Aperçu : la pièce survolée, sinon celle ouverte — si elle n'est pas déjà portée ici.
  const previewRow = destroy
    ? undefined
    : rows.find(
        (r) => r.it.id === (hovId ?? selId) && r.it.equippedOnId !== ucId,
      )
  const prev = previewRow?.next ?? null
  const shownItems = previewRow?.simItems ?? items

  // Mode destruction : coche ; sinon : ouvre/ferme le détail.
  const clickRow = (id: string) => {
    setConfirm(null)
    if (destroy) {
      setChecked((c) =>
        c.includes(id) ? c.filter((x) => x !== id) : [...c, id],
      )
    } else {
      setSelId((cur) => (cur === id ? null : id))
      setHighlight(null)
    }
  }

  const changeSlot = (s: EquipmentSlot) => {
    setSelId(null)
    setChecked([])
    setDestroy(false)
    setConfirm(null)
    onSlotChange(s)
  }

  const onUpgradeSuccess = (res: { milestone: EquipmentMilestone | null }) => {
    if (!res.milestone) {
      return
    }
    setHighlight(res.milestone.key)
    toast({
      title:
        res.milestone.type === 'added'
          ? t('collection:workshop.toastNewSubstat')
          : t('collection:workshop.toastImprovedSubstat'),
      message: bonusText(res.milestone.key, res.milestone.rolledValue),
      severity: TOAST_SEVERITY.SUCCESS,
    })
  }

  const doSalvage = (ids: string[]) => {
    salvage.mutate(ids, {
      onSuccess: (res) => {
        toast({
          title: t('collection:workshop.toastDestroyedTitle'),
          message: t('collection:workshop.toastDestroyedMessage', {
            count: res.destroyedCount,
            amount: formatNumber(res.goldEarned, locale),
          }),
          severity: TOAST_SEVERITY.SUCCESS,
        })
        setChecked([])
        setConfirm(null)
        setDestroy(false)
        if (selId !== null && ids.includes(selId)) {
          setSelId(null)
        }
      },
    })
  }

  const salvageByRarity = economy.equip.salvageGold
  const salvageBonus = skillState?.effects?.salvageBonus
  const checkedGold = salvageGold(
    items.filter((i) => checked.includes(i.id)),
    salvageByRarity,
    salvageBonus,
  )
  const isDefaultPrio = prio.join() === advice.prio.join()

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          {
            label: t('collection:page.breadcrumbCollection'),
            to: '/collection',
          },
          {
            label: card.name,
            to: '/collection',
            search: { card: backKey },
          },
          { label: t('collection:workshop.breadcrumb') },
        ]}
        title={t('collection:workshop.title', { name: card.name })}
        subtitle={t('collection:workshop.meta', {
          set: card.set.name,
          rarity: RARITY_LABEL_FR[card.rarity],
          level: userCard.level,
          count: bySlot.size,
          total: SLOT_ORDER.length,
        })}
        right={
          <Button variant="outline" size="sm" asChild>
            <Link to="/collection" search={{ card: backKey }}>
              <ArrowLeft className="h-4 w-4" />
              {t('collection:workshop.back')}
            </Link>
          </Button>
        }
      />

      {/* Stats à viser */}
      <ArcadeCard className="flex items-center gap-5">
        {/* Rappel visuel de la carte, non cliquable (le retour est en haut). */}
        <div className="relative aspect-[2/3] w-[84px] shrink-0">
          <TcgCardFace
            rarity={card.rarity}
            name={card.name}
            setName={card.set.name}
            imageUrl={card.imageUrl}
            variant={userCard.variant}
            isOwned
            compact
            showName={false}
            element={card.element}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <span className={KICKER}>{t('collection:workshop.prioTitle')}</span>
            <span className="text-[13px] text-text-light">
              {t('collection:workshop.prioHint')}
            </span>
            {!isDefaultPrio && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-[13px] font-bold text-[#b45309]"
                onClick={() => setPrio(advice.prio)}
              >
                {t('collection:workshop.prioReset')}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LAB_STATS.map((k) => {
              const i = prio.indexOf(k)
              return (
                <Button
                  key={k}
                  variant="outline"
                  aria-pressed={i >= 0}
                  onClick={() => setPrio((p) => togglePrio(p, k))}
                  style={{ '--c': statColorVar(k) } as React.CSSProperties}
                  className={cn(
                    'h-[34px] rounded-full border-[rgba(27,23,38,0.1)] bg-card px-3 text-[13px] text-[rgba(27,23,38,0.6)] hover:border-[var(--c)] hover:bg-card hover:text-text',
                    i >= 0 &&
                      'border-[color-mix(in_oklab,var(--c)_45%,white)] bg-[color-mix(in_oklab,var(--c)_12%,white)] text-[color-mix(in_oklab,var(--c)_70%,var(--text))] hover:bg-[color-mix(in_oklab,var(--c)_12%,white)]',
                  )}
                >
                  {i >= 0 && (
                    <em className="grid h-[18px] w-[18px] place-items-center rounded-full bg-[var(--c)] font-mono text-[11px] font-bold not-italic text-white">
                      {i + 1}
                    </em>
                  )}
                  {STAT_LABEL[k]}
                </Button>
              )
            })}
          </div>
          <p className="text-[13.5px] text-[rgba(27,23,38,0.62)]">
            <b className="text-text">
              {t('collection:workshop.adviceLabel', { name: card.name })}
            </b>{' '}
            {t(`collection:workshop.advice.${advice.role}`)}
          </p>
        </div>
      </ArcadeCard>

      <div className="grid grid-cols-1 items-start gap-[22px] min-[980px]:grid-cols-[210px_minmax(0,1fr)] min-[1180px]:grid-cols-[230px_minmax(0,1fr)_380px]">
        {/* Emplacements */}
        <div className="min-[980px]:sticky min-[980px]:top-5">
          <Card
            className={cn(
              PANEL,
              'flex gap-0.5 overflow-x-auto p-2 min-[980px]:flex-col',
            )}
          >
            {SLOT_ORDER.map((s) => {
              const it = bySlot.get(s)
              const Icon = SLOT_ICONS[s]
              const on = s === slot
              return (
                <Button
                  key={s}
                  variant="ghost"
                  onClick={() => changeSlot(s)}
                  aria-current={on}
                  className={cn(
                    'grid h-auto min-w-[150px] grid-cols-[34px_minmax(0,1fr)_8px] justify-normal gap-2.5 rounded-xl px-2.5 py-[9px] text-left text-text hover:bg-[rgba(27,23,38,0.04)] hover:text-text',
                    on &&
                      'bg-[#fff7e6] shadow-[inset_0_0_0_1px_#fde4b0] hover:bg-[#fff7e6]',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-[34px] w-[34px] place-items-center rounded-[10px]',
                      on
                        ? 'bg-primary text-text'
                        : 'bg-[#faf8f4] text-[rgba(27,23,38,0.55)]',
                    )}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <b className="text-[14.5px]">{SLOT_LABELS[s]}</b>
                    <small
                      className="truncate text-xs font-semibold text-[rgba(27,23,38,0.45)]"
                      style={
                        it ? { color: RARITY_COLOR_VAR[it.rarity] } : undefined
                      }
                    >
                      {it ? it.name : t('collection:workshop.empty')}
                    </small>
                  </span>
                  {it && (
                    <i
                      className="h-2 w-2 rounded-full"
                      style={{ background: setColor.get(it.setKey) }}
                    />
                  )}
                </Button>
              )
            })}
          </Card>
        </div>

        {/* Liste des pièces */}
        <Card className={cn(PANEL, PANEL_PAD, 'flex min-w-0 flex-col gap-2')}>
          <div className="mb-1 flex flex-wrap items-baseline gap-3">
            <h2 className="font-display text-xl font-extrabold -tracking-[0.01em]">
              {SLOT_LABELS[slot]}
            </h2>
            <span className="text-[13px] text-text-light">
              {rows.length === slotItems.length
                ? t('collection:workshop.count', { count: rows.length })
                : t('collection:workshop.countFiltered', {
                    count: rows.length,
                    total: slotItems.length,
                  })}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'ml-auto h-7 px-1.5 text-[13px] font-bold',
                destroy ? 'text-[#be123c]' : 'text-[#b45309]',
              )}
              onClick={() => {
                setDestroy((d) => !d)
                setChecked([])
                setConfirm(null)
              }}
            >
              {destroy
                ? t('collection:workshop.cancel')
                : t('collection:workshop.destroyMode')}
            </Button>
          </div>

          <SetFilter
            slotItems={slotItems}
            setDefs={setDefs}
            setColor={setColor}
            selected={setFilter}
            onChange={setSetFilter}
            wornCount={(k) =>
              items.filter((i) => i.equippedOnId === ucId && i.setKey === k)
                .length
            }
          />

          <div className="mb-1.5 flex items-center gap-2">
            <Switch
              id="hide-worn-elsewhere"
              checked={hideWornElsewhere}
              onCheckedChange={setHideWornElsewhere}
            />
            <Label htmlFor="hide-worn-elsewhere" className="text-[13px]">
              {t('collection:workshop.hideWornElsewhere')}
            </Label>
          </div>

          {slotItems.length === 0 ? (
            <p className="my-2 rounded-[14px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.12)] p-5 text-center text-[13px] text-text-light">
              {t('collection:workshop.emptySlot')}
            </p>
          ) : (
            rows.length === 0 && (
              <p className="my-2 rounded-[14px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.12)] p-5 text-center text-[13px] text-text-light">
                {t('collection:workshop.emptyFilter')}
              </p>
            )
          )}

          {/* Liste bornée : l'en-tête et les filtres restent en vue. */}
          <div className="-mx-1 flex max-h-[600px] flex-col gap-2 overflow-y-auto overscroll-contain px-1 py-1">
            {rows.map(({ it, simItems, ds }) => {
              const isCur = it.equippedOnId === ucId
              const open = !destroy && selId === it.id
              const free = it.equippedOnId === null
              const ck = checked.includes(it.id)
              const fx = isCur
                ? null
                : setEffect(
                    curActive,
                    activeSetKeys(simItems, ucId, setDefs),
                    setDef,
                  )
              const mainKey = it.mainStat
              const mainValue = scaledBaseBonus(
                it.bonuses[mainKey] ?? 0,
                it.level,
                economy.equip.levelScale,
                it.baseBoost,
              )
              return (
                <div
                  key={it.id}
                  style={
                    {
                      '--r': RARITY_COLOR_VAR[it.rarity],
                      '--s': setColor.get(it.setKey),
                    } as React.CSSProperties
                  }
                  className={cn(
                    'rounded-[14px] border border-[rgba(27,23,38,0.07)] bg-[#fcfbf8] transition-colors hover:border-[#fcd34d] hover:bg-card',
                    isCur && 'border-[#86efac] bg-[#f0fdf4]',
                    open &&
                      'border-primary bg-card shadow-[0_14px_28px_-18px_rgba(245,158,11,0.5)] hover:border-primary',
                    destroy && !free && 'opacity-45',
                  )}
                >
                  <div className="flex items-center">
                    <Button
                      variant="transparent"
                      size="bare"
                      disabled={destroy && !free}
                      aria-expanded={destroy ? undefined : open}
                      aria-pressed={destroy ? ck : undefined}
                      onMouseEnter={() => !destroy && setHovId(it.id)}
                      onMouseLeave={() => setHovId(null)}
                      onClick={() => clickRow(it.id)}
                      className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] justify-normal gap-3 rounded-[14px] py-3 pl-2.5 pr-3.5 text-left font-normal text-text disabled:opacity-100"
                    >
                      <RowMarker destroy={destroy} checked={ck} />
                      <PieceSummary
                        item={it}
                        isCur={isCur}
                        open={open}
                        prio={prio}
                        mainValue={mainValue}
                        fx={fx}
                      />
                      {!isCur && !destroy && <Verdict ds={ds} />}
                    </Button>
                    {!destroy && (
                      <RowAction
                        isCur={isCur}
                        slotTaken={bySlot.has(slot)}
                        takenFrom={it.equippedOnCardName}
                        busy={busy}
                        onHover={() => setHovId(it.id)}
                        onLeave={() => setHovId(null)}
                        onClick={() =>
                          isCur
                            ? unequipItem.mutate(it.id)
                            : equipItem.mutate({
                                userEquipmentId: it.id,
                                targetUserCardId: ucId,
                              })
                        }
                      />
                    )}
                  </div>

                  {open && (
                    <PieceDetail
                      item={it}
                      mainValue={mainValue}
                      gold={gold}
                      busy={busy}
                      highlight={highlight}
                      maxSubstats={economy.equip.maxSubstats}
                      milestone={economy.equip.substatMilestone}
                      sellGold={salvageGold(
                        [it],
                        salvageByRarity,
                        salvageBonus,
                      )}
                      confirmSell={confirm === it.id}
                      onUpgrade={() => {
                        setHighlight(null)
                        upgradeItem.mutate(it.id, {
                          onSuccess: onUpgradeSuccess,
                        })
                      }}
                      onSell={() =>
                        confirm === it.id
                          ? doSalvage([it.id])
                          : setConfirm(it.id)
                      }
                    />
                  )}
                </div>
              )
            })}
          </div>

          {destroy && (
            <DestroyBar
              count={checked.length}
              gold={checkedGold}
              confirming={confirm === 'batch'}
              busy={busy}
              onClick={() =>
                confirm === 'batch' ? doSalvage(checked) : setConfirm('batch')
              }
            />
          )}
        </Card>

        {/* Stats */}
        <StatsPanel
          cur={cur}
          prev={prev}
          base={base}
          prio={prio}
          shownItems={shownItems}
          userCardId={ucId}
          setDefs={setDefs}
          setColor={setColor}
        />
      </div>
    </>
  )
}

/** Barre collante du mode destruction : décompte + bouton à double clic. */
function DestroyBar({
  count,
  gold,
  confirming,
  busy,
  onClick,
}: {
  count: number
  gold: number
  confirming: boolean
  busy: boolean
  onClick: () => void
}) {
  const { t } = useTranslation('collection')
  const amount = formatNumber(gold, currentLocale())
  return (
    <div className="sticky bottom-3 mt-1 flex items-center justify-between gap-3 rounded-[14px] bg-text py-2.5 pl-4 pr-2.5 text-[13px] text-white">
      <span>{t('collection:workshop.selected', { count })}</span>
      <Button
        variant="outline"
        disabled={count === 0 || busy}
        onClick={onClick}
        className="h-[38px] rounded-xl border-[#fecdd3] bg-[#fff1f2] font-bold text-[#be123c] hover:border-[#be123c] hover:bg-[#ffe4e6] hover:text-[#be123c]"
      >
        {confirming
          ? t('collection:workshop.destroyConfirm', { count, amount })
          : t('collection:workshop.destroy', { amount })}
      </Button>
    </div>
  )
}

// Équiper / remplacer / déséquiper sans ouvrir le détail.
function RowAction({
  isCur,
  slotTaken,
  takenFrom,
  busy,
  onHover,
  onLeave,
  onClick,
}: {
  isCur: boolean
  slotTaken: boolean
  takenFrom: string | null
  busy: boolean
  onHover: () => void
  onLeave: () => void
  onClick: () => void
}) {
  const { t } = useTranslation('collection')
  const label = isCur
    ? t('collection:workshop.unequip')
    : slotTaken
      ? t('collection:workshop.replace')
      : t('collection:workshop.equip')
  const Icon = isCur ? X : slotTaken ? Repeat : Plus
  return (
    <Button
      variant={isCur ? 'outline' : 'amber'}
      size="icon-sm"
      disabled={busy}
      aria-label={label}
      title={
        takenFrom && !isCur
          ? label + t('collection:workshop.takenFrom', { name: takenFrom })
          : label
      }
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="mr-3 shrink-0"
    >
      <Icon className="h-4 w-4" />
    </Button>
  )
}

function RowMarker({
  destroy,
  checked,
}: {
  destroy: boolean
  checked: boolean
}) {
  if (!destroy) {
    return <span className="w-1 self-stretch rounded bg-[var(--r)]" />
  }
  return (
    <span
      className={cn(
        'grid h-5 w-5 place-items-center rounded-md border-[1.5px] border-[rgba(27,23,38,0.25)] bg-card text-white',
        checked && 'border-[#be123c] bg-[#be123c]',
      )}
    >
      {checked && <Check className="h-[13px] w-[13px]" />}
    </span>
  )
}

/** Verdict selon les stats visées : Mieux / Moins bien / Équivalent. */
function Verdict({ ds }: { ds: number }) {
  const { t } = useTranslation('collection')
  const up = ds > 0.01
  const down = ds < -0.01
  return (
    <span
      className={cn(
        'whitespace-nowrap rounded-full bg-[rgba(27,23,38,0.05)] px-2.5 py-[5px] text-xs font-bold text-[rgba(27,23,38,0.55)]',
        up && 'bg-[#dcfce7] text-[#15803d]',
        down && 'bg-[#ffe4e6] text-[#be123c]',
      )}
    >
      {up
        ? t('collection:workshop.better')
        : down
          ? t('collection:workshop.worse')
          : t('collection:workshop.same')}
    </span>
  )
}

/**
 * Titre de la ligne + résumé (stat de base, sous-stats) + effet de set s'il
 * change. Le résumé est masqué quand le détail est ouvert.
 */
function PieceSummary({
  item: it,
  isCur,
  open,
  prio,
  mainValue,
  fx,
}: {
  item: EquipmentInstance
  isCur: boolean
  open: boolean
  prio: LabStat[]
  mainValue: number
  fx: { up: boolean; def: EquipmentSetDefinition } | null
}) {
  const { t } = useTranslation('collection')
  const mainKey = it.mainStat
  return (
    <span className="flex min-w-0 flex-col gap-[7px]">
      <span className="flex flex-wrap items-baseline gap-2">
        <b className="text-[15px]">{it.name}</b>
        <span className="font-mono text-xs text-[rgba(27,23,38,0.55)]">
          {t('collection:workshop.itemLevel', {
            level: it.level,
          })}
        </span>
        <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color-mix(in_oklab,var(--r)_75%,var(--text))]">
          {RARITY_LABEL_FR[it.rarity]}
        </span>
        {isCur && (
          <span className="text-xs font-bold text-[#15803d]">
            {t('collection:workshop.equipped')}
          </span>
        )}
        {!isCur && it.equippedOnCardName && (
          <span className="rounded-full bg-[rgba(27,23,38,0.06)] px-2 py-0.5 text-[11.5px] font-semibold text-[rgba(27,23,38,0.6)]">
            {t('collection:workshop.on', {
              name: it.equippedOnCardName,
            })}
          </span>
        )}
      </span>
      {!open && (
        <span className="flex flex-wrap items-center gap-[5px]">
          <span
            style={
              {
                '--c': statColorVar(mainKey),
              } as React.CSSProperties
            }
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[color-mix(in_oklab,var(--c)_14%,white)] py-1 pl-2 pr-[9px] font-mono text-[12.5px] font-extrabold text-[color-mix(in_oklab,var(--c)_80%,var(--text))] shadow-[inset_0_0_0_1.5px_color-mix(in_oklab,var(--c)_40%,white)]"
          >
            <i className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />
            {bonusText(mainKey, mainValue)}
          </span>
          {it.substats.length > 0 && (
            <span className="mx-[3px] h-[18px] w-px bg-[rgba(27,23,38,0.14)]" />
          )}
          {it.substats.map((s) => (
            <span
              key={s.key}
              style={
                {
                  '--c': statColorVar(s.key),
                } as React.CSSProperties
              }
              className={cn(
                'inline-flex items-center gap-[5px] whitespace-nowrap rounded-[7px] bg-[#f6f4ef] py-[3px] pl-[7px] pr-2 font-mono text-[11.5px] font-semibold text-[color-mix(in_oklab,var(--c)_75%,var(--text))]',
                prio.includes(bonusStat(s.key)) &&
                  'bg-[color-mix(in_oklab,var(--c)_10%,white)] font-extrabold',
              )}
            >
              <i className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />
              {bonusText(s.key, s.value)}
            </span>
          ))}
        </span>
      )}
      {fx && (
        <span className="flex items-center gap-[7px] text-[12.5px] font-bold">
          <i className="h-2 w-2 shrink-0 rounded-full bg-[var(--s)]" />
          {fx.up ? (
            <span className="text-[#15803d]">
              {t('collection:workshop.activates', {
                set: fx.def.label,
                bonus: fx.def.bonus.label,
              })}
            </span>
          ) : (
            <span className="text-[#be123c]">
              {t('collection:workshop.breaks', {
                set: fx.def.label,
                bonus: fx.def.bonus.label,
              })}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

function SetFilter({
  slotItems,
  setDefs,
  setColor,
  selected,
  onChange,
  wornCount,
}: {
  slotItems: EquipmentInstance[]
  setDefs: EquipmentSetDefinition[]
  setColor: Map<string, string>
  selected: string[]
  onChange: (next: string[]) => void
  wornCount: (key: string) => number
}) {
  const { t } = useTranslation('collection')
  const chip =
    'h-8 gap-[7px] rounded-full border-[rgba(27,23,38,0.1)] bg-card pl-3 pr-2.5 text-[13px] text-[rgba(27,23,38,0.65)] hover:bg-card hover:text-text disabled:opacity-35'
  return (
    <div className="mb-1.5 flex flex-wrap gap-1.5">
      <Button
        variant="outline"
        aria-pressed={selected.length === 0}
        onClick={() => onChange([])}
        className={cn(
          chip,
          'px-3',
          selected.length === 0 &&
            'border-text bg-text text-white hover:bg-text hover:text-white',
        )}
      >
        {t('collection:workshop.allSets')}
      </Button>
      {setDefs.map((def) => {
        const n = slotItems.filter((i) => i.setKey === def.key).length
        const on = selected.includes(def.key)
        const worn = Math.min(wornCount(def.key), def.pieces)
        return (
          <Button
            key={def.key}
            variant="outline"
            disabled={n === 0}
            aria-pressed={on}
            title={`${def.pieces} pc · ${def.bonus.label}`}
            onClick={() =>
              onChange(
                on
                  ? selected.filter((k) => k !== def.key)
                  : [...selected, def.key],
              )
            }
            style={{ '--s': setColor.get(def.key) } as React.CSSProperties}
            className={cn(
              chip,
              'hover:border-[var(--s)]',
              on &&
                'border-[color-mix(in_oklab,var(--s)_50%,white)] bg-[color-mix(in_oklab,var(--s)_12%,white)] text-text hover:bg-[color-mix(in_oklab,var(--s)_12%,white)]',
            )}
          >
            <i className="h-2 w-2 rounded-full bg-[var(--s)]" />
            {def.label}
            {worn > 0 && (
              <span className="font-mono text-[10.5px] font-bold text-[color-mix(in_oklab,var(--s)_75%,var(--text))]">
                {worn}/{def.pieces}
              </span>
            )}
            <span className="h-[18px] min-w-[18px] rounded-full bg-[rgba(27,23,38,0.06)] px-1 text-center font-mono text-[11px] leading-[18px] text-[rgba(27,23,38,0.55)]">
              {n}
            </span>
          </Button>
        )
      })}
    </div>
  )
}

function PieceDetail({
  item,
  mainValue,
  gold,
  busy,
  highlight,
  maxSubstats,
  milestone,
  sellGold,
  confirmSell,
  onUpgrade,
  onSell,
}: {
  item: EquipmentInstance
  mainValue: number
  gold: number
  busy: boolean
  highlight: string | null
  maxSubstats: number
  milestone: number
  sellGold: number
  confirmSell: boolean
  onUpgrade: () => void
  onSell: () => void
}) {
  const { t } = useTranslation('collection')
  const locale = currentLocale()
  const worn = item.equippedOnId !== null
  // Coût renvoyé par le serveur, remise d'équipe incluse ; null au niveau max.
  const cost = item.nextUpgradeCost
  const nextIsMilestone = cost !== null && (item.level + 1) % milestone === 0
  // Clés positionnelles : les emplacements libres n'ont pas d'identité.
  const freeKeys = Array.from(
    { length: Math.max(0, maxSubstats - item.substats.length) },
    (_, i) => `free-${item.substats.length + i}`,
  )

  const line = (key: string, value: number, hl: boolean) => (
    <li
      key={key}
      style={{ '--c': statColorVar(key) } as React.CSSProperties}
      className={cn(
        'flex items-center gap-2 rounded-[7px] px-2 py-[3px] font-mono text-[13px] font-bold uppercase tracking-[0.02em] text-[color-mix(in_oklab,var(--c)_78%,var(--text))]',
        hl && 'bg-primary/15',
      )}
    >
      <i className="h-[7px] w-[7px] rounded-full bg-[var(--c)]" />
      {bonusText(key, value)}
    </li>
  )

  return (
    <div className="grid grid-cols-1 gap-[18px] border-t border-dashed border-[rgba(27,23,38,0.1)] px-4 pb-4 pt-3.5 md:grid-cols-[minmax(0,1fr)_210px] md:pl-[26px]">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <span className={KICKER}>{t('collection:workshop.baseBonus')}</span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {line(item.mainStat, mainValue, false)}
          </ul>
        </div>
        <div>
          <span className={KICKER}>{t('collection:workshop.substats')}</span>
          <ul className="mt-1.5 flex flex-col gap-1">
            {item.substats.map((s) =>
              line(s.key, s.value, highlight === s.key),
            )}
            {freeKeys.map((key) => (
              <li
                key={key}
                className="rounded-[7px] border border-dashed border-[rgba(27,23,38,0.14)] px-2 py-[3px] text-xs text-[rgba(27,23,38,0.35)]"
              >
                {t('collection:workshop.emptySub')}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          disabled={busy || cost === null || gold < cost}
          onClick={onUpgrade}
          title={
            nextIsMilestone
              ? item.substats.length >= maxSubstats
                ? t('collection:workshop.upgradeHintImproved')
                : t('collection:workshop.upgradeHintNew')
              : undefined
          }
          className={ACT}
        >
          {cost === null ? (
            t('collection:workshop.maxLevel')
          ) : (
            <>
              <span>
                {t('collection:workshop.upgrade', { level: item.level + 1 })}
              </span>
              <span className="font-mono text-xs text-[#b45309]">
                {t('collection:workshop.upgradeCost', {
                  amount: formatNumber(cost, locale),
                })}
              </span>
              {nextIsMilestone && (
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              )}
            </>
          )}
        </Button>
        <Button
          variant="outline"
          disabled={busy || worn}
          onClick={onSell}
          className={cn(
            ACT,
            'border-[#fecdd3] bg-[#fff1f2] text-[#be123c] hover:border-[#be123c] hover:bg-[#ffe4e6] hover:text-[#be123c]',
          )}
        >
          {confirmSell
            ? t('collection:workshop.sellConfirm', {
                amount: formatNumber(sellGold, locale),
              })
            : t('collection:workshop.sell', {
                amount: formatNumber(sellGold, locale),
              })}
        </Button>
        {worn && (
          <p className="text-center text-xs text-text-light">
            {t('collection:workshop.unequipToSell')}
          </p>
        )}
      </div>
    </div>
  )
}

function StatsPanel({
  cur,
  prev,
  base,
  prio,
  shownItems,
  userCardId,
  setDefs,
  setColor,
}: {
  cur: LabTotals
  prev: LabTotals | null
  base: LabTotals
  prio: LabStat[]
  shownItems: EquipmentInstance[]
  userCardId: string
  setDefs: EquipmentSetDefinition[]
  setColor: Map<string, string>
}) {
  const { t } = useTranslation('collection')
  const locale = currentLocale()
  const show = prev ?? cur
  const setDef = new Map<string, EquipmentSetDefinition>(
    setDefs.map((d) => [d.key, d]),
  )
  // Tous les sets, toujours dans le même ordre : la hauteur du panneau ne
  // dépend pas du survol. Sinon une ligne qui apparaît à l'aperçu agrandit la
  // page, décale le défilement et fait sauter la pièce sous le curseur.
  const worn = activeSetsForCard(
    shownItems
      .filter((i) => i.equippedOnId === userCardId)
      .map((i) => i.setKey),
    setDefs,
  )
  const sets = setDefs.map(
    (def) =>
      worn.find((w) => w.key === def.key) ?? {
        key: def.key,
        label: def.label,
        count: 0,
        pieces: def.pieces,
        active: false,
      },
  )
  const row =
    'grid grid-cols-[8px_minmax(0,1fr)_44px_50px_50px_46px] items-center gap-1.5'
  const head =
    'text-right font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-[rgba(27,23,38,0.4)]'

  return (
    <Card
      className={cn(
        PANEL,
        'flex flex-col gap-3.5 p-[22px] min-[980px]:col-span-2 min-[1180px]:sticky min-[1180px]:top-5 min-[1180px]:col-span-1',
      )}
    >
      <div className="flex items-center gap-2.5 rounded-[14px] border border-[#fde4b0] bg-[#fff7e6] px-3.5 py-3">
        <span className={KICKER}>{t('collection:workshop.power')}</span>
        <b className="ml-auto font-display text-[30px] font-extrabold leading-none text-[#d97706]">
          {formatNumber(show.power, locale)}
        </b>
        {prev && <Delta v={prev.power - cur.power} />}
      </div>

      <ul className="flex flex-col gap-0.5">
        <li
          className={cn(
            row,
            'mb-0.5 border-b border-[rgba(27,23,38,0.07)] px-2 pb-1',
          )}
        >
          <span />
          <span className={cn(head, 'text-left')}>
            {t('collection:workshop.colStat')}
          </span>
          <span className={head}>{t('collection:workshop.colBase')}</span>
          <span className={head}>{t('collection:workshop.colEquip')}</span>
          <span className={head}>{t('collection:workshop.colTotal')}</span>
          <span className={head}>
            {prev ? t('collection:workshop.colPreview') : ''}
          </span>
        </li>
        {LAB_STATS.map((k) => {
          const pi = prio.indexOf(k)
          const g = show[k] - base[k]
          return (
            <li
              key={k}
              style={{ '--c': statColorVar(k) } as React.CSSProperties}
              className={cn(
                row,
                'rounded-[9px] px-2 py-1.5 text-sm',
                pi >= 0 && 'bg-[color-mix(in_oklab,var(--c)_7%,white)]',
              )}
            >
              <i className="h-2 w-2 rounded-full bg-[var(--c)]" />
              <span
                className={cn(
                  'flex min-w-0 items-center gap-[5px] truncate text-[13px] text-[rgba(27,23,38,0.65)]',
                  pi >= 0 && 'font-semibold text-text',
                )}
              >
                {STAT_LABEL[k]}
                {pi >= 0 && (
                  <em className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--c)] font-mono text-[10px] font-bold not-italic text-white">
                    {pi + 1}
                  </em>
                )}
              </span>
              <span className="whitespace-nowrap text-right font-mono text-[12.5px] tabular-nums text-[rgba(27,23,38,0.5)]">
                {fmt(k, base[k])}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-right font-mono text-[12.5px] tabular-nums text-[rgba(27,23,38,0.3)]',
                  g > 0 &&
                    'font-bold text-[color-mix(in_oklab,var(--c)_75%,var(--text))]',
                )}
              >
                {g > 0 ? `+${fmt(k, g)}` : '—'}
              </span>
              <b className="text-right font-display text-[15px] font-extrabold tabular-nums">
                {fmt(k, show[k])}
              </b>
              <span className="text-right">
                {prev && <Delta v={prev[k] - cur[k]} k={k} />}
              </span>
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col gap-1.5 border-t border-[rgba(27,23,38,0.07)] pt-3">
        <span className={KICKER}>{t('collection:workshop.sets')}</span>
        {sets.map((s) => {
          const n = Math.min(s.count, s.pieces)
          return (
            <div
              key={s.key}
              style={{ '--s': setColor.get(s.key) } as React.CSSProperties}
              className={cn(
                'grid grid-cols-[minmax(0,1fr)_auto_30px] items-center gap-2.5 py-1 text-[13.5px]',
                s.count === 0 && 'opacity-45',
              )}
            >
              <span
                className={cn(
                  'flex items-center gap-1 truncate text-[rgba(27,23,38,0.55)]',
                  s.active &&
                    'font-bold text-[color-mix(in_oklab,var(--s)_75%,var(--text))]',
                )}
              >
                {s.active && <Check className="h-3 w-3 shrink-0" />}
                <b className="text-text">{s.label}</b>
                <span>: {setDef.get(s.key)?.bonus.label}</span>
              </span>
              <span className="inline-flex gap-[3px]">
                {SEGMENT_KEYS.slice(0, s.pieces).map((key, i) => (
                  <i
                    key={key}
                    className={cn(
                      'h-1.5 w-3.5 rounded-[3px]',
                      i < n
                        ? 'bg-[var(--s)]'
                        : 'bg-[color-mix(in_oklab,var(--s)_16%,white)]',
                    )}
                  />
                ))}
              </span>
              <span
                className={cn(
                  'text-right font-mono text-xs',
                  s.active &&
                    'font-bold text-[color-mix(in_oklab,var(--s)_75%,var(--text))]',
                )}
              >
                {n}/{s.pieces}
              </span>
            </div>
          )
        })}
      </div>

      {/* Toujours rendu (masqué hors aperçu) : le panneau garde sa hauteur. */}
      <p
        className={cn(
          'text-center text-xs font-semibold text-[#b45309]',
          !prev && 'invisible',
        )}
      >
        {t('collection:workshop.previewHint')}
      </p>
    </Card>
  )
}
