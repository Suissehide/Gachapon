import { Plus, Users } from 'lucide-react'
import { useState } from 'react'

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

export function CreateTeamPopup() {
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
      <PopupTrigger variant="default" size="sm">
        <Plus className="h-4 w-4" />
        Créer
      </PopupTrigger>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<Users className="h-4 w-4" />}>
            Nouvelle équipe
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
              {(field) => <field.Input label="Nom de l'équipe" />}
            </form.AppField>
            <form.AppField name="description">
              {(field) => <field.Input label="Description (optionnel)" />}
            </form.AppField>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </PopupBody>
          <PopupFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Création...' : 'Créer'}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
