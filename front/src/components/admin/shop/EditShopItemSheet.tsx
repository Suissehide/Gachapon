import {
  CURRENCY_OPTIONS,
  ITEM_TYPE_OPTIONS,
} from '../../../constants/shop.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminShopItem } from '../../../queries/useAdminShop'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

export type EditShopItemPayload = {
  nameFr: string
  nameEn: string
  descriptionFr: string
  descriptionEn: string
  type: string
  cost: number
  currency: string
  isActive: boolean
}

interface EditShopItemSheetProps {
  item: AdminShopItem | null
  onOpenChange: (open: boolean) => void
  onSave: (data: EditShopItemPayload) => void
  onDelete: () => void
}

export function EditShopItemSheet({
  item,
  onOpenChange,
  onSave,
  onDelete,
}: EditShopItemSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-6 px-6">
            <EditShopItemForm
              key={item.id}
              item={item}
              onSave={onSave}
              onDelete={onDelete}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function EditShopItemForm({
  item,
  onSave,
  onDelete,
}: {
  item: AdminShopItem
  onSave: (data: EditShopItemPayload) => void
  onDelete: () => void
}) {
  const form = useAppForm({
    defaultValues: {
      nameFr: item.nameFr,
      nameEn: item.nameEn,
      descriptionFr: item.descriptionFr,
      descriptionEn: item.descriptionEn,
      type: item.type,
      cost: item.cost,
      currency: item.currency,
      isActive: item.isActive,
    },
    onSubmit: ({ value }) => {
      onSave(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="space-y-3"
    >
      <form.AppField name="isActive">
        {(field) => (
          <field.Toggle label="Statut" options={['Actif', 'Inactif']} />
        )}
      </form.AppField>
      <form.AppField name="nameFr">
        {(field) => <field.Input label="Nom (français)" />}
      </form.AppField>
      <form.AppField name="nameEn">
        {(field) => <field.Input label="Nom (anglais)" />}
      </form.AppField>
      <form.AppField name="descriptionFr">
        {(field) => <field.Input label="Description (français)" />}
      </form.AppField>
      <form.AppField name="descriptionEn">
        {(field) => <field.Input label="Description (anglais)" />}
      </form.AppField>
      <form.AppField name="type">
        {(field) => <field.Select label="Type" options={ITEM_TYPE_OPTIONS} />}
      </form.AppField>
      <form.AppField name="cost">
        {(field) => <field.Number label="Coût" />}
      </form.AppField>
      <form.AppField name="currency">
        {(field) => <field.Select label="Monnaie" options={CURRENCY_OPTIONS} />}
      </form.AppField>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Sauvegarder
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-destructive/30 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </form>
  )
}
