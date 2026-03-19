import { useAppForm } from '../../../hooks/formConfig'
import { useAdminCreateSet } from '../../../queries/useAdminCards'
import { Button } from '../../ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet'

export function CreateSetSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const createSet = useAdminCreateSet()

  const form = useAppForm({
    defaultValues: { name: '', description: '' },
    onSubmit: ({ value }) => {
      createSet.mutate({
        name: value.name,
        description: value.description || undefined,
        isActive: false,
      })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nouveau set</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
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
            <form.AppField name="description">
              {(f) => <f.Input label="Description (optionnelle)" />}
            </form.AppField>
            <Button type="submit" className="w-full">
              Créer
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
