import { useAppForm } from '../../../hooks/formConfig'
import type { AdminCardSet } from '../../../queries/useAdminCards'
import { useAdminUpdateSet } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

function EditSetForm({
  set,
  onClose,
}: {
  set: AdminCardSet
  onClose: () => void
}) {
  const updateSet = useAdminUpdateSet()

  const form = useAppForm({
    defaultValues: {
      name: set.name,
      description: set.description ?? '',
      isActive: set.isActive,
    },
    onSubmit: ({ value }) => {
      updateSet.mutate({
        id: set.id,
        name: value.name,
        description: value.description || undefined,
        isActive: value.isActive,
      })
      onClose()
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
        {(f) => <f.Toggle label="Statut" options={['Actif', 'Inactif']} />}
      </form.AppField>
      <form.AppField name="name">
        {(f) => <f.Input label="Nom" />}
      </form.AppField>
      <form.AppField name="description">
        {(f) => <f.Input label="Description" />}
      </form.AppField>
      <Button type="submit" className="w-full">
        Sauvegarder
      </Button>
    </form>
  )
}

export function EditSetSheet({
  set,
  onOpenChange,
}: {
  set: AdminCardSet | null
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Sheet open={!!set} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{set?.name ?? ''}</SheetTitle>
        </SheetHeader>
        {set && (
          <div className="mt-6 px-6">
            <EditSetForm
              key={set.id}
              set={set}
              onClose={() => onOpenChange(false)}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
