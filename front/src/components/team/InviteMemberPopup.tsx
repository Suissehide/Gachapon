import { Send, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { useInviteMember } from '../../queries/useTeams.ts'
import { Button } from '../ui/button.tsx'
import { Input } from '../ui/input.tsx'
import {
  Popup,
  PopupBody,
  PopupContent,
  PopupFooter,
  PopupHeader,
  PopupTitle,
  PopupTrigger,
} from '../ui/popup.tsx'

export function InviteMemberPopup({ teamId }: { teamId: string }) {
  const { mutate: invite, isPending } = useInviteMember(teamId)
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)

  const handleInvite = () => {
    const value = input.trim()
    if (!value) return
    setError('')
    const isEmail = value.includes('@')
    invite(isEmail ? { email: value } : { username: value }, {
      onSuccess: () => {
        setInput('')
        setOpen(false)
      },
      onError: (err) => setError(err.message),
    })
  }

  return (
    <Popup open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setInput(''); setError('') } }}>
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
        <PopupBody>
          <p className="mb-3 text-sm text-text-light">
            Entrez le pseudo ou l'adresse e-mail du joueur à inviter.
          </p>
          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (error) setError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleInvite()
            }}
            placeholder="@pseudo ou email"
            autoFocus
          />
          {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
        </PopupBody>
        <PopupFooter>
          <Button
            onClick={handleInvite}
            disabled={isPending || !input.trim()}
          >
            <Send className="h-4 w-4" />
            {isPending ? 'Envoi…' : 'Envoyer l'invitation'}
          </Button>
        </PopupFooter>
      </PopupContent>
    </Popup>
  )
}
