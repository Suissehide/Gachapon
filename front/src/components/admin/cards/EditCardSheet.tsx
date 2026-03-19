import { RARITY_OPTIONS } from '../../../constants/card.constant'
import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCard } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

export type EditCardPayload = {
  name: string
  rarity: string
  dropWeight: number
}

interface EditCardSheetProps {
  item: AdminCard | null
  onOpenChange: (open: boolean) => void
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}

export function EditCardSheet({
  item,
  onOpenChange,
  onSave,
  onDelete,
}: EditCardSheetProps) {
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{item?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {item && (
          <div className="mt-6 px-6">
            <EditCardForm
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

function EditCardForm({
  item,
  onSave,
  onDelete,
}: {
  item: AdminCard
  onSave: (data: EditCardPayload) => void
  onDelete: () => void
}) {
  const form = useAppForm({
    defaultValues: {
      name: item.name,
      rarity: item.rarity,
      dropWeight: item.dropWeight as number | undefined,
    },
    onSubmit: ({ value }) => {
      onSave({
        name: value.name,
        rarity: value.rarity,
        dropWeight: value.dropWeight ?? 1,
      })
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
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="rarity">
        {(f) => <f.Select label="Rareté" options={RARITY_OPTIONS} />}
      </form.AppField>
      <form.AppField name="dropWeight">
        {(f) => <f.Number label="Poids de drop" />}
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
