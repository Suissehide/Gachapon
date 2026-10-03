import { useNavigate } from '@tanstack/react-router'
import {
  Circle,
  Footprints,
  Gem,
  Hand,
  Link,
  Plus,
  Repeat,
  Settings2,
  Shield,
  Sword,
} from 'lucide-react'
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import type {
  EquipmentInstance,
  EquipmentSlot,
} from '../../api/equipment.api.ts'
import i18n from '../../i18n/index.ts'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { cn } from '../../libs/utils.ts'
import {
  useActiveSetsForCard,
  useCardsByPower,
  useEquipmentList,
  useSetColorByKey,
  useSwapEquipment,
} from '../../queries/useEquipment.ts'
import { Button } from '../ui/button.tsx'
import { Input, Select } from '../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../ui/popup.tsx'
import { CollectionCard } from './CollectionCard.tsx'
import {
  ELEMENT_OPTIONS,
  type ElementFilter,
  FilterField,
  RARITY_OPTIONS,
  type RarityFilter,
} from './CollectionFilters.tsx'

export const SLOT_ORDER = [
  'WEAPON',
  'ARMOR',
  'RING',
  'AMULET',
  'GLOVES',
  'BOOTS',
  'BELT',
] as const satisfies readonly EquipmentSlot[]
// Exportés : réutilisés par l'écran de tour (routes/_authenticated/tower.tsx)
// pour afficher le slot alimenté par chaque tour, sans en recopier une
// troisième version — equipment.tsx en garde malheureusement déjà une copie
// séparée (dette existante, hors périmètre de la tour).
export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: i18n.t('equipment:slots.weapon'),
  ARMOR: i18n.t('equipment:slots.armor'),
  RING: i18n.t('equipment:slots.ring'),
  AMULET: i18n.t('equipment:slots.amulet'),
  GLOVES: i18n.t('equipment:slots.gloves'),
  BOOTS: i18n.t('equipment:slots.boots'),
  BELT: i18n.t('equipment:slots.belt'),
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
type Props = {
  userCardId: string
  rarityHex: string
}

export function EquipmentSlotsPanel({ userCardId, rarityHex }: Props) {
  const { t } = useTranslation('collection')
  const equipment = useEquipmentList()
  const activeSets = useActiveSetsForCard(userCardId)
  const navigate = useNavigate()
  const [swapOpen, setSwapOpen] = useState(false)
  // L'atelier « Équiper » remplace l'ancienne fenêtre par emplacement.
  const openWorkshop = (slot?: EquipmentSlot) =>
    navigate({
      to: '/collection/$userCardId/equipment',
      params: { userCardId },
      search: { slot },
    })

  // Couleur d'un set = couleur de la stat qu'il buffe (règle du handoff),
  // dérivée de `GET /equipment/sets`.
  const setColorByKey = useSetColorByKey()

  const items = equipment.data?.items ?? []
  const equippedOnCard = items.filter((i) => i.equippedOnId === userCardId)
  const bySlot: Partial<Record<EquipmentSlot, EquipmentInstance>> = {}
  for (const item of equippedOnCard) {
    bySlot[item.slot] = item
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(27,23,38,0.45)]">
          {t('collection:slotsPanel.title')}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-6 px-2 font-mono text-[11px] uppercase tracking-[0.08em]"
          onClick={() => setSwapOpen(true)}
        >
          <Repeat className="h-3.5 w-3.5" />
          {t('collection:slotsPanel.swap')}
        </Button>
        <p className="font-mono text-[11px] tabular-nums tracking-[0.08em] text-[rgba(27,23,38,0.38)]">
          <Trans
            t={t}
            i18nKey="collection:slotsPanel.equippedCount"
            count={equippedOnCard.length}
            values={{ total: SLOT_ORDER.length }}
            components={{ equipped: <b className="text-text" /> }}
          />
        </p>
      </div>

      {/* Sets portés : pastille, nom, avancement — le détail vit dans l'atelier. */}
      {activeSets.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {activeSets.map((set) => (
            <span
              key={set.key}
              style={
                {
                  '--s': setColorByKey.get(set.key) ?? 'var(--stat-def)',
                } as React.CSSProperties
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-[rgba(27,23,38,0.1)] bg-card px-2.5 py-1 text-xs font-semibold text-[rgba(27,23,38,0.65)]',
                set.active &&
                  'border-[color-mix(in_oklab,var(--s)_45%,white)] bg-[color-mix(in_oklab,var(--s)_10%,white)] text-text',
              )}
            >
              <i className="h-2 w-2 rounded-full bg-[var(--s)]" />
              {set.label}
              <span className="font-mono text-[10.5px] font-bold tabular-nums text-[color-mix(in_oklab,var(--s)_75%,var(--text))]">
                {Math.min(set.count, set.pieces)}/{set.pieces}
              </span>
            </span>
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
                onClick={() => openWorkshop(slot)}
                // La rareté et le set ne sont plus écrits sur la tuile : le
                // survol et les lecteurs d'écran les redonnent en toutes
                // lettres.
                title={t('collection:slotsPanel.slotTitle', {
                  name: item.name,
                  rarity: RARITY_LABEL_FR[item.rarity] ?? item.rarity,
                  set: item.setLabel,
                  level: item.level,
                })}
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
                {/* Set de la pièce : pastille de 10 px à la couleur du set,
                    cerclée de blanc pour se détacher du dégradé de rareté.
                    À 6 px elle se lisait mal sur une tuile de cette taille —
                    le set est l'information qu'on cherche du regard quand on
                    compose une carte. Pas de bandeau de couleur en haut de
                    tuile — le handoff l'a testé puis retiré. */}
                {setColorByKey.has(item.setKey) && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[var(--set)] shadow-[0_0_0_2px_white]"
                  />
                )}
                {/* La rareté ne s'écrit plus : elle est portée par le fond,
                    la bordure, l'icône et le chiffre du niveau. */}
                <Icon className="mb-1.5 h-[18px] w-[18px] text-[var(--rar)]" />
                <p className="line-clamp-2 font-display text-[11.5px] font-extrabold leading-[1.25] text-text">
                  {item.name}
                </p>
                <p className="mt-1 font-mono text-[9.5px] tracking-[0.1em] text-[rgba(27,23,38,0.45)]">
                  {t('collection:slotsPanel.itemLevel')}{' '}
                  <b className="text-[var(--rar)]">{item.level}</b>
                </p>
              </Button>
            )
          }
          return (
            <Button
              key={slot}
              variant="outline"
              onClick={() => openWorkshop(slot)}
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

      <Button
        variant="outline"
        onClick={() => openWorkshop()}
        className="mt-3 h-auto w-full rounded-[11px] border-[rgba(27,23,38,0.14)] py-[9px] text-[13.5px] font-semibold"
      >
        <Settings2 className="h-[15px] w-[15px]" />
        {t('collection:slotsPanel.manage')}
      </Button>

      {swapOpen && (
        <SwapEquipmentPopup
          userCardId={userCardId}
          onClose={() => setSwapOpen(false)}
        />
      )}
    </div>
  )
}

/**
 * Choix de la carte avec laquelle échanger tout l'équipement — mêmes
 * vignettes et même ordre (puissance décroissante) que « Équiper sur… » de
 * la page Équipement.
 */
function SwapEquipmentPopup({
  userCardId,
  onClose,
}: {
  userCardId: string
  onClose: () => void
}) {
  const { t } = useTranslation('collection')
  const [search, setSearch] = useState('')
  const [rarity, setRarity] = useState<RarityFilter>('all')
  const [element, setElement] = useState<ElementFilter>('all')
  const query = search.trim().toLowerCase()
  const cards = useCardsByPower().filter(
    (uc) =>
      uc.id !== userCardId &&
      (rarity === 'all' || uc.card.rarity === rarity) &&
      (element === 'all' || uc.card.element === element) &&
      uc.card.name.toLowerCase().includes(query),
  )
  const swap = useSwapEquipment()
  return (
    <Popup open onOpenChange={(v) => !v && onClose()}>
      <PopupContent size="xl">
        <PopupHeader>
          <PopupTitle
            icon={<Repeat className="h-4 w-4" />}
            subtitle={t('collection:slotsPanel.swapSubtitle')}
          >
            {t('collection:slotsPanel.swapTitle')}
          </PopupTitle>
        </PopupHeader>
        <PopupBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <FilterField
              id="swap-search"
              label={t('collection:slotsPanel.swapSearchLabel')}
            >
              <Input
                id="swap-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('collection:slotsPanel.swapSearchPlaceholder')}
              />
            </FilterField>
            <FilterField
              id="swap-rarity"
              label={t('collection:filters.labels.rarity')}
            >
              <Select
                id="swap-rarity"
                options={RARITY_OPTIONS}
                value={rarity}
                onValueChange={(v) => setRarity(v as RarityFilter)}
                clearable={false}
              />
            </FilterField>
            <FilterField
              id="swap-element"
              label={t('collection:filters.labels.element')}
            >
              <Select
                id="swap-element"
                options={ELEMENT_OPTIONS}
                value={element}
                onValueChange={(v) => setElement(v as ElementFilter)}
                clearable={false}
              />
            </FilterField>
          </div>
          {cards.length === 0 && (
            <p className="py-8 text-center text-sm text-text-light">
              {t('collection:slotsPanel.swapEmpty')}
            </p>
          )}
          <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto p-2 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((uc) => (
              <CollectionCard
                key={uc.id}
                card={uc.card}
                variant={uc.variant}
                // Pas de pastille ×N : les doublons n'ont pas de sens pour un échange.
                quantity={1}
                isOwned
                userCardId={uc.id}
                level={uc.level}
                palier={uc.palier}
                onClick={() => {
                  if (swap.isPending) {
                    return
                  }
                  swap.mutate(
                    { fromUserCardId: userCardId, toUserCardId: uc.id },
                    { onSuccess: onClose },
                  )
                }}
              />
            ))}
          </div>
        </PopupBody>
        <PopupFooter>
          <Button variant="outline" onClick={onClose}>
            {t('collection:slotsPanel.swapCancel')}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
