import { Send, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useInviteMember } from '../../queries/useTeams.ts'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../ui/popup.tsx'
import { Button } from '../ui/button.tsx'

export function InviteMemberPopup({ teamId }: { teamId: string }) {
  const { mutate: invite, isPending } = useInviteMember(teamId)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const form = useAppForm({
    defaultValues: { identifier: '' },
    onSubmit: ({ value }) => {
      const identifier = value.identifier.trim()
      if (!identifier) {
        return
      }
      setError('')
      const isEmail = identifier.includes('@')
      invite(isEmail ? { email: identifier } : { username: identifier }, {
        onSuccess: () => handleOpenChange(false),
        onError: (err) => setError(err.message),
      })
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
      <PopupTrigger variant="outline" size="sm">
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </PopupTrigger>
      <PopupContent>
        <PopupHeader>
          <PopupTitle icon={<UserPlus className="h-4 w-4" />}>
            Inviter un membre
          </PopupTitle>
        </PopupHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            await form.handleSubmit()
          }}
        >
          <PopupBody className="flex flex-col gap-3">
            <p className="text-sm text-text-light">
              Entrez le pseudo ou l'adresse e-mail du joueur à inviter.
            </p>
            <form.AppField name="identifier">
              {(field) => <field.Input label="Pseudo ou e-mail" />}
            </form.AppField>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </PopupBody>
          <PopupFooter>
            <Button type="submit" disabled={isPending}>
              <Send className="h-4 w-4" />
              {isPending ? 'Envoi…' : "Envoyer l'invitation"}
            </Button>
          </PopupFooter>
        </form>
      </PopupContent>
    </Popup>
  )
}
