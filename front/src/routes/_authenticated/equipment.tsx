import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  ChevronsUp,
  CircleHelp,
  Coins,
  ShieldOff,
  Sword,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  EquipmentDrop,
  EquipmentInstance,
  EquipmentRarity,
  EquipmentSetKey,
  EquipmentSlot,
} from '../../api/equipment.api'
import {
  FilterField,
  RarityDot,
} from '../../components/collection/CollectionFilters.tsx'
import { EquipmentDropCard } from '../../components/equipment/EquipmentDropCard.tsx'
import { PageHeader } from '../../components/shared/PageHeader.tsx'
import { PageShell } from '../../components/shared/PageShell.tsx'
import { CardDisplay } from '../../components/shared/tcg-card/CardDisplay.tsx'
import { Button } from '../../components/ui/button.tsx'
import { Checkbox } from '../../components/ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
} from '../../components/ui/popup.tsx'
import { SelectMulti } from '../../components/ui/selectMulti.tsx'
import { RARITY_COLOR_VAR, RARITY_LABEL_FR } from '../../libs/rarity.ts'
import { useUserCollection } from '../../queries/useCollection.ts'
import {
  DEFAULT_ECONOMY,
  useEconomyConfig,
} from '../../queries/useEconomyConfig.ts'
import {
  useEquipItem,
  useEquipmentList,
  useEquipmentSets,
  useSalvageItems,
  useUnequipItem,
  useUpgradeItem,
} from '../../queries/useEquipment.ts'
import { useAuthStore } from '../../stores/auth.store.ts'

// Options de rareté — mêmes libellés et mêmes pastilles que la page
// Collection, dont on réutilise RARITY_LABEL_FR et RARITY_COLOR_VAR plutôt
// que d'en recopier une seconde table.
const RARITY_FILTER_OPTIONS = (
  ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] as EquipmentRarity[]
).map((r) => ({
  value: r,
  label: RARITY_LABEL_FR[r] ?? r,
  icon: <RarityDot color={RARITY_COLOR_VAR[r] ?? ''} />,
}))

export const Route = createFileRoute('/_authenticated/equipment')({
  component: EquipmentPage,
})

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  WEAPON: 'Arme',
  ARMOR: 'Armure',
  RING: 'Anneau',
  AMULET: 'Amulette',
  GLOVES: 'Gants',
  BOOTS: 'Bottes',
  BELT: 'Ceinture',
}
// Ordre d'affichage du filtre de slot, dérivé de SLOT_LABELS plutôt que
// recopié : une seule liste des 7 slots dans ce fichier.
const SLOT_FILTER_OPTIONS = (
  Object.entries(SLOT_LABELS) as [EquipmentSlot, string][]
).map(([value, label]) => ({ value, label }))

function EquipmentPage() {
  const user = useAuthStore((s) => s.user)
  const equipment = useEquipmentList()
  const equipmentSets = useEquipmentSets()
  const collection = useUserCollection(user?.id)
  const equipItem = useEquipItem()
  const unequipItem = useUnequipItem()
  const salvageItems = useSalvageItems()
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()

  const [slotFilter, setSlotFilter] = useState<EquipmentSlot[]>([])
  const [rarityFilter, setRarityFilter] = useState<EquipmentRarity[]>([])
  // Filtre par set : indispensable dès que l'inventaire grossit (tours
  // élémentaires). Multi-sélection, sur le modèle de DropdownFilter ailleurs
  // dans l'app (voir admin.cards.tsx).
  const [setFilter, setSetFilter] = useState<EquipmentSetKey[]>([])
  // Sélection pour la vente groupée. Un Set d'identifiants : l'inventaire peut
  // compter des centaines de pièces, et un tableau imposerait un parcours à
  // chaque case cochée.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmSell, setConfirmSell] = useState(false)
  const [pickerFor, setPickerFor] = useState<EquipmentInstance | null>(null)

  const sets = equipmentSets.data?.sets ?? []
  const items = equipment.data?.items ?? []
  const filtered = useMemo(
    () =>
      items.filter((i) => {
        if (slotFilter.length > 0 && !slotFilter.includes(i.slot)) {
          return false
        }
        if (rarityFilter.length > 0 && !rarityFilter.includes(i.rarity)) {
          return false
        }
        if (setFilter.length > 0 && !setFilter.includes(i.setKey)) {
          return false
        }
        return true
      }),
    [items, slotFilter, rarityFilter, setFilter],
  )

  // Une pièce portée ne se vend pas : le serveur la refuse, donc elle n'entre
  // jamais dans la sélection.
  const sellable = filtered.filter((i) => !i.equippedOnId)
  const selectedItems = items.filter((i) => selected.has(i.id))
  const selectionGold = selectedItems.reduce(
    (sum, i) => sum + (economy.equip.salvageGold[i.rarity] ?? 0),
    0,
  )
  const allSellableSelected =
    sellable.length > 0 && sellable.every((i) => selected.has(i.id))

  const toggleSelected = (id: string, checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(id)
      } else {
        next.delete(id)
      }
      return next
    })

  // Vendre un légendaire est irréversible et coûte cher à refarmer : on
  // demande confirmation plutôt que de laisser un clic distrait le détruire.
  const legendariesSelected = selectedItems.filter(
    (i) => i.rarity === 'LEGENDARY',
  )

  const sellSelection = () => {
    salvageItems.mutate(
      selectedItems.map((i) => i.id),
      {
        onSuccess: () => {
          setSelected(new Set())
          setConfirmSell(false)
        },
      },
    )
  }

  const handleSellSelection = () => {
    if (selectedItems.length === 0) {
      return
    }
    if (legendariesSelected.length > 0) {
      setConfirmSell(true)
      return
    }
    sellSelection()
  }

  const handleEquipOn = (targetUserCardId: string) => {
    if (!pickerFor) {
      return
    }
    equipItem.mutate(
      { userEquipmentId: pickerFor.id, targetUserCardId },
      { onSuccess: () => setPickerFor(null) },
    )
  }

  const handleUnequip = (id: string) => unequipItem.mutate(id)

  return (
    <PageShell>
      <PageHeader
        breadcrumbs={[
          { label: 'Gachapon', to: '/play' },
          { label: 'Équipement' },
        ]}
        title="Mon équipement"
        subtitle="Pièces collectées via les combats"
      />

      <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
        {/* Type : même forme que le filtre de sets — déroulant, multi-choix,
            et son libellé porté par le déclencheur. C'était un contrôle
            segmenté sans intitulé. */}
        <FilterField id="filter-equip-slot" label="Type">
          <SelectMulti
            id="filter-equip-slot"
            options={SLOT_FILTER_OPTIONS}
            value={slotFilter}
            onChange={(v) => setSlotFilter(v as EquipmentSlot[])}
          />
        </FilterField>
        {/* Même filtre que la page Collection : un Select intitulé « Rareté »
            avec une pastille de couleur par option. Il affichait auparavant
            « Co / Pc / R / E / L » sans intitulé, illisible pour qui ne
            connaît pas déjà l'ordre des raretés. */}
        <FilterField id="filter-equip-rarity" label="Rareté">
          <SelectMulti
            id="filter-equip-rarity"
            options={RARITY_FILTER_OPTIONS}
            value={rarityFilter}
            onChange={(v) => setRarityFilter(v as EquipmentRarity[])}
          />
        </FilterField>
        <FilterField id="filter-equip-set" label="Set">
          <SelectMulti
            id="filter-equip-set"
            options={sets.map((st) => ({ value: st.key, label: st.label }))}
            value={setFilter}
            onChange={(v) => setSetFilter(v as EquipmentSetKey[])}
          />
        </FilterField>
      </div>

      {sellable.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <Checkbox
            checked={allSellableSelected}
            onChange={(e) =>
              setSelected(
                e.target.checked
                  ? new Set(sellable.map((i) => i.id))
                  : new Set(),
              )
            }
          />
          <span className="text-sm text-text-light">
            {selected.size > 0
              ? `${selected.size} pièce${selected.size > 1 ? 's' : ''} sélectionnée${selected.size > 1 ? 's' : ''}`
              : 'Tout sélectionner'}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto gap-1 border-destructive/25 text-destructive hover:bg-destructive/10"
            disabled={selected.size === 0 || salvageItems.isPending}
            onClick={handleSellSelection}
          >
            <Coins className="h-3.5 w-3.5" />
            Vendre la sélection
            <span className="font-mono text-[10px] opacity-70">
              +{selectionGold.toLocaleString('fr-FR')} or
            </span>
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center text-text-light">
          <CircleHelp className="mx-auto mb-2 h-8 w-8" />
          Aucune pièce d'équipement collectée pour l'instant.
          <br />
          Combats et boss en laissent tomber !
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <EquipmentCard
              key={item.id}
              item={item}
              selected={selected.has(item.id)}
              onSelectedChange={(v) => toggleSelected(item.id, v)}
              onEquipClick={() => setPickerFor(item)}
              onUnequipClick={() => handleUnequip(item.id)}
              isPending={equipItem.isPending || unequipItem.isPending}
            />
          ))}
        </div>
      )}

      <Popup open={confirmSell} onOpenChange={setConfirmSell}>
        <PopupContent>
          <PopupHeader>
            <PopupTitle
              icon={<AlertTriangle className="h-4 w-4" />}
              subtitle="Cette action est définitive."
            >
              Vendre {legendariesSelected.length} légendaire
              {legendariesSelected.length > 1 ? 's' : ''} ?
            </PopupTitle>
          </PopupHeader>
          <PopupBody>
            <p className="text-sm text-text-light">
              La sélection contient{' '}
              <span className="font-semibold text-text">
                {legendariesSelected.length} pièce
                {legendariesSelected.length > 1 ? 's' : ''} légendaire
                {legendariesSelected.length > 1 ? 's' : ''}
              </span>{' '}
              sur {selectedItems.length}. Vendre rapportera{' '}
              <span className="font-semibold text-text">
                {selectionGold.toLocaleString('fr-FR')} or
              </span>
              .
            </p>
            <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto">
              {legendariesSelected.map((i) => (
                <li key={i.id} className="font-mono text-xs text-text-light">
                  · {i.name}
                </li>
              ))}
            </ul>
          </PopupBody>
          <PopupFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmSell(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={salvageItems.isPending}
              onClick={sellSelection}
            >
              Vendre quand même
            </Button>
          </PopupFooter>
        </PopupContent>
      </Popup>

      {pickerFor && (
        <Popup open onOpenChange={(v) => !v && setPickerFor(null)}>
          <PopupContent size="xl">
            <PopupHeader>
              <PopupTitle
                icon={<Sword className="h-4 w-4" />}
                subtitle="Sélectionne la carte qui recevra cette pièce."
              >
                Équiper "{pickerFor.name}" sur…
              </PopupTitle>
            </PopupHeader>
            <PopupBody className="flex flex-col gap-4">
              <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-4">
                {(collection.data?.cards ?? []).map((uc) => (
                  <button
                    key={uc.id}
                    type="button"
                    onClick={() => handleEquipOn(uc.id)}
                    disabled={equipItem.isPending}
                    className="rounded-lg border border-border p-2 transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <CardDisplay
                      rarity={uc.card.rarity}
                      name={uc.card.name}
                      setName={uc.card.set.name}
                      imageUrl={uc.card.imageUrl}
                      variant={uc.variant}
                      isOwned
                      compact
                    />
                    <p className="mt-1 text-center text-[10px] text-text-light">
                      Niv. {uc.level} · P{uc.palier}
                    </p>
                  </button>
                ))}
              </div>
            </PopupBody>
            <PopupFooter>
              <Button variant="outline" onClick={() => setPickerFor(null)}>
                Annuler
              </Button>
            </PopupFooter>
          </PopupContent>
        </Popup>
      )}
    </PageShell>
  )
}

function EquipmentCard({
  item,
  onEquipClick,
  onUnequipClick,
  isPending,
  selected,
  onSelectedChange,
}: {
  item: EquipmentInstance
  onEquipClick: () => void
  onUnequipClick: () => void
  isPending: boolean
  selected: boolean
  onSelectedChange: (checked: boolean) => void
}) {
  const { data: economy = DEFAULT_ECONOMY } = useEconomyConfig()
  const upgradeItem = useUpgradeItem()
  const salvageItems = useSalvageItems()
  const gold = useAuthStore((st) => st.user?.gold ?? 0)
  // Écart de la dernière amélioration, effacé au bout de quelques secondes :
  // c'est un accusé de réception, pas une information permanente.
  const [gain, setGain] = useState<{ key: string; delta: number } | null>(null)

  useEffect(() => {
    if (!gain) {
      return
    }
    const t = setTimeout(() => setGain(null), 4000)
    return () => clearTimeout(t)
  }, [gain])

  // Même fiche que l'écran de victoire, avec les actions d'inventaire à la
  // place du bouton « Détruire ». `EquipmentInstance` porte déjà tous les
  // champs d'`EquipmentDrop` ; seul l'identifiant change de nom.
  const drop: EquipmentDrop = {
    userEquipmentId: item.id,
    equipmentId: item.equipmentId,
    name: item.name,
    rarity: item.rarity,
    slot: item.slot,
    setKey: item.setKey,
    level: item.level,
    bonuses: item.bonuses,
    substats: item.substats,
    baseBoost: item.baseBoost,
  }

  // Coût d'amélioration — même formule que `upgradeGoldCost` côté serveur
  // (base × exp^(niveau-1) × multiplicateur de rareté). Le multiplicateur est
  // celui des cartes, que le domaine réutilise pour l'équipement.
  const atMaxLevel = item.level >= economy.equip.maxLevel
  const upgradeCost = Math.round(
    economy.equip.goldCostBase *
      economy.equip.goldCostExp ** (item.level - 1) *
      (economy.card.rarityMult[item.rarity] ?? 1),
  )
  const salvageGold = economy.equip.salvageGold[item.rarity] ?? 0
  const busy = isPending || upgradeItem.isPending || salvageItems.isPending
  // On ne vend pas une pièce portée : le serveur la refuse, autant le dire
  // avant le clic plutôt qu'après l'erreur.
  const canSalvage = !item.equippedOnId && !busy

  return (
    <EquipmentDropCard
      className="h-full"
      // Sélection pour la vente groupée, en haut à droite au-dessus de la
      // pastille de rareté. Jamais sur une pièce portée : le serveur
      // refuserait de la vendre.
      trailing={
        item.equippedOnId ? undefined : (
          <Checkbox
            aria-label={`Sélectionner ${item.name}`}
            checked={selected}
            onChange={(e) => onSelectedChange(e.target.checked)}
          />
        )
      }
      drop={drop}
      equipLevelScale={economy.equip.levelScale}
      highlight={gain}
      actions={
        <div className="flex flex-col gap-2">
          {item.equippedOnId ? (
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate font-mono text-[11px] text-text-light">
                <Zap className="mr-0.5 inline h-3 w-3" />
                Sur {item.equippedOnCardName ?? '…'}
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={onUnequipClick}
                disabled={busy}
                className="shrink-0"
              >
                <ShieldOff className="mr-1 h-3 w-3" />
                Retirer
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onEquipClick}
              disabled={busy}
              className="w-full"
            >
              Équiper
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-auto flex-1 flex-col gap-0 py-1.5"
              disabled={busy || atMaxLevel || gold < upgradeCost}
              onClick={() =>
                upgradeItem.mutate(item.id, {
                  onSuccess: (res) => {
                    if (res.milestone) {
                      setGain({
                        key: res.milestone.key,
                        delta: res.milestone.rolledValue,
                      })
                    }
                  },
                })
              }
            >
              {/* Le prix passe AU-DESSUS du libellé : c'est lui qu'on compare
                  d'une pièce à l'autre, le verbe ne change jamais. */}
              <span className="font-mono text-[10px] opacity-70">
                {atMaxLevel ? '—' : `${upgradeCost.toLocaleString('fr-FR')} or`}
              </span>
              <span className="inline-flex items-center gap-1">
                <ChevronsUp className="h-3.5 w-3.5" />
                {atMaxLevel ? 'Niveau max' : 'Améliorer'}
              </span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-auto flex-1 flex-col gap-0 border-destructive/25 py-1.5 text-destructive hover:bg-destructive/10"
              disabled={!canSalvage}
              onClick={() => salvageItems.mutate([item.id])}
              title={
                item.equippedOnId
                  ? 'Retire la pièce de sa carte avant de la vendre'
                  : undefined
              }
            >
              <span className="font-mono text-[10px] opacity-70">
                +{salvageGold.toLocaleString('fr-FR')} or
              </span>
              <span className="inline-flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                Vendre
              </span>
            </Button>
          </div>
        </div>
      }
    />
  )
}
