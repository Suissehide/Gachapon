import {
  Circle,
  Footprints,
  Gem,
  Hand,
  Layers,
  Link,
  Plus,
  Shield,
  Sword,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  EquipmentInstance,
  EquipmentSetDefinition,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import {
  useActiveSetsForCard,
  useCardEquipmentContribution,
  useEquipmentList,
  useEquipmentSets,
} from '../../queries/useEquipment.ts'
import {
  type ActiveSetSummary,
  type StatBonuses,
  type StuffStatBonuses,
  statColorVar,
} from '../../utils/cardStats.ts'
import { Button } from '../ui/button.tsx'
import { EquipmentSlotPopup } from './EquipmentSlotPopup.tsx'

const SLOT_ORDER: EquipmentSlot[] = [
  'WEAPON',
  'ARMOR',
  'RING',
  'AMULET',
  'GLOVES',
  'BOOTS',
  'BELT',
]
// Exportés : réutilisés par l'écran de tour (routes/_authenticated/tower.tsx)
// pour afficher le slot alimenté par chaque tour, sans en recopier une
// troisième version — equipment.tsx en garde malheureusement déjà une copie
// séparée (dette existante, hors périmètre de la tour).
export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: 'Arme',
  ARMOR: 'Armure',
  RING: 'Anneau',
  AMULET: 'Amulette',
  GLOVES: 'Gants',
  BOOTS: 'Bottes',
  BELT: 'Ceinture',
}
export const SLOT_ICONS: Record<EquipmentSlot, typeof Sword> = {
  WEAPON: Sword,
  ARMOR: Shield,
  RING: Circle,
  AMULET: Gem,
  GLOVES: Hand,
  BOOTS: Footprints,
  BELT: Link,
}
// Libellés courts des stats pour les chips d'apport — ceux déjà employés
// par le panneau de combat juste au-dessus, pour qu'une carte ne nomme pas la
// même stat de deux façons.
const STAT_CHIP_LABELS: Record<string, string> = {
  hp: 'PV',
  atk: 'ATQ',
  def: 'DEF',
  spd: 'VIT',
  critRate: 'TAUX CRIT',
  critDmg: 'DÉG. CRIT',
  armorPen: 'PÉNÉ. ARMURE',
  lifesteal: 'VOL DE VIE',
}

// Toute valeur de stat est entière depuis l'arrondi à la source.
function formatChipValue(value: number, pct: boolean): string {
  return `+${Math.round(value).toLocaleString('fr-FR')}${pct ? ' %' : ''}`
}

// Clés stables des segments de jauge : un set demande 2, 3 ou 4 pièces, et
// les segments sont positionnels — nommés plutôt qu'indexés pour ne pas
// bâtir une clé React sur un index.
const SEGMENT_KEYS = ['pc-1', 'pc-2', 'pc-3', 'pc-4']

type GainChip = { id: string; label: string; value: string; color: string }

/**
 * Chips d'apport total : la part des pièces (plats puis pourcentages), puis
 * celle des sets actifs. Les deux restent séparées — « VIT +22 » et
 * « VIT +10 % » ne viennent pas de la même décision de jeu.
 */
function buildGainChips(
  classic: StatBonuses,
  stuff: StuffStatBonuses,
  setBonuses: Record<string, number>,
): GainChip[] {
  const chips: GainChip[] = []
  for (const [stat, bonus] of Object.entries(classic)) {
    const color = statColorVar(stat)
    const label = STAT_CHIP_LABELS[stat] ?? stat.toUpperCase()
    if (bonus.flat !== 0) {
      chips.push({
        id: `${stat}-flat`,
        label,
        value: formatChipValue(bonus.flat, false),
        color,
      })
    }
    if (bonus.pct !== 0) {
      chips.push({
        id: `${stat}-pct`,
        label,
        value: formatChipValue(bonus.pct, true),
        color,
      })
    }
  }
  for (const [stat, value] of Object.entries(stuff)) {
    if (value !== 0) {
      chips.push({
        id: `${stat}-stuff`,
        label: STAT_CHIP_LABELS[stat] ?? stat.toUpperCase(),
        value: formatChipValue(value, true),
        color: statColorVar(stat),
      })
    }
  }
  for (const [key, value] of Object.entries(setBonuses)) {
    if (value !== 0) {
      const stat = key.replace(/Pct$|Flat$/, '')
      chips.push({
        id: `${key}-set`,
        label: STAT_CHIP_LABELS[stat] ?? stat.toUpperCase(),
        value: formatChipValue(value, key.endsWith('Pct')),
        color: statColorVar(key),
      })
    }
  }
  return chips
}

/**
 * Bandeau d'un set porté : nom, compteur et jauge d'une case par pièce
 * requise. Remplace la pastille « CÉLÉRITÉ 3/2 », qui ne disait ni le palier
 * atteint ni ce qu'il restait à faire.
 *
 * La maquette dessine 4 segments et deux paliers (2 PC puis 4 PC) ; ici un
 * set a UNE taille (2, 3 ou 4) et UN bonus, donc la jauge porte autant de
 * segments que le set demande de pièces et la ligne de palier est unique.
 */
function SetBanner({
  summary,
  color,
  bonusLabel,
}: {
  summary: ActiveSetSummary
  color: string
  bonusLabel: string | undefined
}) {
  // Porter plus de pièces que le set n'en demande n'apporte rien : la jauge
  // plafonne, sinon elle déborderait de segments allumés.
  const filled = Math.min(summary.count, summary.pieces)
  return (
    <div
      className="rounded-[14px] border px-[13px] py-3"
      style={
        {
          '--s': color,
          background: 'color-mix(in oklab, var(--s) 7%, white)',
          borderColor: 'color-mix(in oklab, var(--s) 22%, white)',
        } as React.CSSProperties
      }
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 shrink-0 text-[var(--s)]" />
        <span className="truncate font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--s)]">
          {summary.label}
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums text-[color-mix(in_oklab,var(--s)_70%,var(--text))]">
          {filled} / {summary.pieces} pièces
        </span>
      </div>

      <div className="flex gap-[3px]">
        {SEGMENT_KEYS.slice(0, summary.pieces).map((segKey, i) => (
          <span
            key={segKey}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              i < filled
                ? 'bg-[var(--s)]'
                : 'bg-[color-mix(in_oklab,var(--s)_16%,white)]',
            )}
          />
        ))}
      </div>

      {bonusLabel !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'shrink-0 rounded-[5px] px-[5px] py-0.5 font-mono text-[10px] tracking-[0.1em]',
              summary.active
                ? 'bg-[var(--s)] text-white'
                : 'bg-[color-mix(in_oklab,var(--s)_14%,white)] text-[color-mix(in_oklab,var(--s)_75%,var(--text))]',
            )}
          >
            {summary.pieces} PC
          </span>
          <span
            className={cn(
              'truncate font-semibold',
              summary.active ? 'text-text' : 'text-text-light',
            )}
          >
            {bonusLabel}
          </span>
        </div>
      )}
    </div>
  )
}

function GainRow({ chips }: { chips: GainChip[] }) {
  return (
    <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-[rgba(27,23,38,0.07)] pt-3">
      <p className="mb-0.5 w-full font-mono text-[11px] uppercase tracking-[0.12em] text-[rgba(27,23,38,0.42)]">
        Apport total
      </p>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="inline-flex items-center gap-[5px] rounded-lg px-[9px] py-1 font-mono text-xs font-bold tabular-nums"
          style={
            {
              '--c': chip.color,
              background: 'color-mix(in oklab, var(--c) 9%, white)',
              color: 'color-mix(in oklab, var(--c) 85%, var(--text))',
            } as React.CSSProperties
          }
        >
          <i className="h-1.5 w-1.5 rounded-full bg-[var(--c)]" />
          {chip.label} {chip.value}
        </span>
      ))}
    </div>
  )
}

type Props = {
  userCardId: string
  rarityHex: string
}

export function EquipmentSlotsPanel({ userCardId, rarityHex }: Props) {
  const equipment = useEquipmentList()
  const activeSets = useActiveSetsForCard(userCardId)
  const sets = useEquipmentSets()
  const contribution = useCardEquipmentContribution(userCardId)
  const [pickerSlot, setPickerSlot] = useState<EquipmentSlot | null>(null)

  // Couleur d'un set = couleur de la stat qu'il buffe (règle du handoff).
  // Elle se déduit donc de `GET /equipment/sets`, pas d'une table de teintes
  // recopiée côté front : un set dont le bonus changerait de stat change de
  // couleur tout seul.
  const setColorByKey = useMemo(() => {
    const byKey = new Map<string, string>()
    for (const def of sets.data?.sets ?? []) {
      const statKey = Object.keys(def.bonus.bonuses)[0]
      if (statKey !== undefined) {
        byKey.set(def.key, statColorVar(statKey))
      }
    }
    return byKey
  }, [sets.data])

  const items = equipment.data?.items ?? []
  const equippedOnCard = items.filter((i) => i.equippedOnId === userCardId)
  const bySlot: Partial<Record<EquipmentSlot, EquipmentInstance>> = {}
  for (const item of equippedOnCard) {
    bySlot[item.slot] = item
  }

  const setDefByKey = new Map<string, EquipmentSetDefinition>(
    (sets.data?.sets ?? []).map((def) => [def.key, def]),
  )
  const gainChips = buildGainChips(
    contribution.classic,
    contribution.stuff,
    contribution.setBonuses,
  )

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
          Équipement
        </p>
        <p className="font-mono text-[11px] tabular-nums tracking-[0.08em] text-[rgba(27,23,38,0.38)]">
          <b className="text-text">{equippedOnCard.length}</b> /{' '}
          {SLOT_ORDER.length} équipés
        </p>
      </div>

      {activeSets.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          {activeSets.map((summary) => (
            <SetBanner
              key={summary.key}
              summary={summary}
              color={setColorByKey.get(summary.key) ?? 'var(--stat-def)'}
              bonusLabel={setDefByKey.get(summary.key)?.bonus.label}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {SLOT_ORDER.map((slot) => {
          const item = bySlot[slot]
          const Icon = SLOT_ICONS[slot]
          if (item) {
            return (
              <Button
                key={slot}
                variant="outline"
                onClick={() => setPickerSlot(slot)}
                // La rareté et le set ne sont plus écrits sur la tuile : le
                // survol et les lecteurs d'écran les redonnent en toutes
                // lettres.
                title={`${item.name} — ${RARITY_LABEL_FR[item.rarity] ?? item.rarity} · set ${item.setLabel} · Nv. ${item.level}`}
                style={
                  {
                    '--rar': RARITY_COLOR_VAR[item.rarity],
                    '--set': setColorByKey.get(item.setKey),
                  } as React.CSSProperties
                }
                // Tuile équipée du handoff : dégradé de rareté vers le blanc,
                // bordure de rareté à 35 %, lévitation de 2 px au survol.
                className="relative h-auto flex-col gap-0 overflow-hidden rounded-[13px] border border-[color-mix(in_oklab,var(--rar)_35%,white)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--rar)_13%,white),white_70%)] px-2 pb-[9px] pt-[11px] text-center transition-[transform,box-shadow] hover:-translate-y-0.5 hover:border-[color-mix(in_oklab,var(--rar)_35%,white)] hover:bg-[linear-gradient(180deg,color-mix(in_oklab,var(--rar)_13%,white),white_70%)] hover:text-text hover:shadow-[0_10px_22px_-12px_color-mix(in_oklab,var(--rar)_80%,transparent)]"
              >
                {/* Set de la pièce : pastille de 6 px à la couleur du set,
                    cerclée de blanc pour se détacher du dégradé de rareté.
                    Pas de bandeau de couleur en haut de tuile — le handoff
                    l'a testé puis retiré. */}
                {setColorByKey.has(item.setKey) && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--set)] shadow-[0_0_0_2px_white]"
                  />
                )}
                {/* La rareté ne s'écrit plus : elle est portée par le fond,
                    la bordure, l'icône et le chiffre du niveau. */}
                <Icon className="mb-1.5 h-[18px] w-[18px] text-[var(--rar)]" />
                <p className="line-clamp-2 font-display text-[11.5px] font-extrabold leading-[1.25] text-text">
                  {item.name}
                </p>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.1em] text-[rgba(27,23,38,0.45)]">
                  NV. <b className="text-[var(--rar)]">{item.level}</b>
                </p>
              </Button>
            )
          }
          return (
            <Button
              key={slot}
              variant="outline"
              onClick={() => setPickerSlot(slot)}
              style={{ '--rar-hover': rarityHex } as React.CSSProperties}
              className="h-auto flex-col gap-0 rounded-[13px] border-[1.5px] border-dashed border-[rgba(27,23,38,0.14)] bg-[#fbfbf9] px-2 pb-[9px] pt-[11px] transition-transform hover:-translate-y-0.5 hover:bg-[color-mix(in_oklab,var(--rar-hover)_6%,#fbfbf9)] hover:text-[var(--rar-hover)]"
            >
              <Icon className="mb-1.5 h-[18px] w-[18px] text-[rgba(27,23,38,0.24)]" />
              <p className="font-display text-[11.5px] font-semibold leading-[1.25] text-[rgba(27,23,38,0.38)]">
                {SLOT_LABELS[slot]}
              </p>
              <Plus className="mt-[5px] h-[15px] w-[15px] text-[rgba(27,23,38,0.28)]" />
            </Button>
          )
        })}
      </div>

      {gainChips.length > 0 && <GainRow chips={gainChips} />}

      {pickerSlot !== null && (
        <EquipmentSlotPopup
          slot={pickerSlot}
          userCardId={userCardId}
          onClose={() => setPickerSlot(null)}
        />
      )}
    </div>
  )
}
