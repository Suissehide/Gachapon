import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('admin')

  const form = useAppForm({
    defaultValues: {
      nameFr: '',
      nameEn: '',
      descriptionFr: '',
      descriptionEn: '',
    },
    onSubmit: ({ value }) => {
      createSet.mutate({
        nameFr: value.nameFr,
        nameEn: value.nameEn,
        descriptionFr: value.descriptionFr || undefined,
        descriptionEn: value.descriptionEn || undefined,
        isActive: false,
      })
      onOpenChange(false)
    },
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('cards.setSheet.createTitle')}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 px-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
            className="space-y-3"
          >
            <form.AppField name="nameFr">
              {(f) => <f.Input label={t('cards.setSheet.nameFrLabel')} />}
            </form.AppField>
            <form.AppField name="nameEn">
              {(f) => <f.Input label={t('cards.setSheet.nameEnLabel')} />}
            </form.AppField>
            <form.AppField name="descriptionFr">
              {(f) => (
                <f.Input label={t('cards.setSheet.descriptionFrCreateLabel')} />
              )}
            </form.AppField>
            <form.AppField name="descriptionEn">
              {(f) => (
                <f.Input label={t('cards.setSheet.descriptionEnCreateLabel')} />
              )}
            </form.AppField>
            <Button type="submit" className="w-full">
              {t('cards.setSheet.submitCreate')}
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
