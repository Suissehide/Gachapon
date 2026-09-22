import { Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useCreateTeam } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../ui/popup.tsx'

// `trigger` permet à « Mes équipes » de rattacher le même flux de création à
// deux affordances visuellement différentes (le bouton d'en-tête et chaque
// emplacement libre en pointillés) sans dupliquer la logique du formulaire.
// Par défaut : le déclencheur historique, désormais aligné sur le libellé du
// handoff (« Créer une équipe » + icône users, pas l'abrégé « Créer »).
export function CreateTeamPopup({ trigger }: { trigger?: ReactNode } = {}) {
  const { t } = useTranslation('team')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const { mutate: createTeam, isPending } = useCreateTeam()

  const form = useAppForm({
    defaultValues: { name: '', description: '' },
    onSubmit: ({ value }) => {
      const name = value.name.trim()
      if (!name) {
        return
      }
      setError('')
      createTeam(
        { name, description: value.description.trim() || undefined },
        {
          onSuccess: () => {
            handleOpenChange(false)
          },
          onError: (err) => setError(err.message),
        },
      )
    },
  })

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      form.reset()
      setError('')
    }
    setOpen(value)
  }

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      {trigger ?? (
        <PopupTrigger variant="default" className="gap-2">
          <Users className="h-4 w-4" />
          {t('createPopup.trigger')}
        </PopupTrigger>
      )}
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<Users className="h-4 w-4" />}>
            {t('createPopup.title')}
          </PopupTitle>
        </PopupHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await form.handleSubmit()
          }}
        >
          <PopupBody className="flex flex-col gap-3">
            <form.AppField name="name">
              {(field) => <field.Input label={t('fields.name')} />}
            </form.AppField>
            <form.AppField name="description">
              {(field) => <field.Input label={t('fields.description')} />}
            </form.AppField>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </PopupBody>
          <PopupFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('createPopup.creating') : t('createPopup.create')}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
