import { ITEM_TYPE_OPTIONS } from '../../../constants/shop.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminShopItem } from '../../../queries/useAdminShop'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

export type EditShopItemPayload = {
  name: string
  description: string
  type: string
  dustCost: number
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
      name: item.name,
      description: item.description,
      type: item.type,
      dustCost: item.dustCost,
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
      <form.AppField name="name">
        {(field) => <field.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="description">
        {(field) => <field.Input label="Description" />}
      </form.AppField>
      <form.AppField name="type">
        {(field) => <field.Select label="Type" options={ITEM_TYPE_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dustCost">
        {(field) => <field.Number label="Coût (dust)" />}
      </form.AppField>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Sauvegarder
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="border border-red-500/30 text-red-400 hover:text-red-400"
          onClick={onDelete}
        >
          Supprimer
        </Button>
      </div>
    </form>
  )
}
