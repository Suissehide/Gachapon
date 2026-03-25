import { Mail, RefreshCw, Send, UserPlus } from 'lucide-react'
import { useState } from 'react'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useInviteMember, useResendInvitation, useTeamInvitations } from '../../queries/useTeams.ts'
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

const RESEND_COOLDOWN_MS = 5 * 60 * 1000

export function InviteMemberPopup({ teamId }: { teamId: string }) {
  const { mutate: invite, isPending } = useInviteMember(teamId)
  const { data: invitationsData } = useTeamInvitations(teamId)
  const { mutate: resend, isPending: isResending, variables: resendToken } = useResendInvitation(teamId)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  const form = useAppForm({
    defaultValues: { identifier: '' },
    onSubmit: ({ value }) => {
      const identifier = value.identifier.trim()
      if (!identifier) return
      setError('')
      const isEmail = identifier.includes('@')
      invite(isEmail ? { email: identifier } : { username: identifier }, {
        onSuccess: () => {
          form.reset()
        },
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

  const invitations = invitationsData?.invitations ?? []

  return (
    <Popup open={open} onOpenChange={handleOpenChange}>
      <PopupTrigger variant="outline" size="sm">
        <UserPlus className="h-4 w-4" />
        Inviter un membre
      </PopupTrigger>
      <PopupContent className="max-w-lg">
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
          <PopupBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-light">
                Entrez le pseudo ou l'adresse e-mail du joueur à inviter.
              </p>
              <form.AppField name="identifier">
                {(field) => <field.Input label="Pseudo ou e-mail" />}
              </form.AppField>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {invitations.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold text-text-light uppercase tracking-wide">
                  Invitations en attente
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium text-text-light">Destinataire</th>
                        <th className="px-3 py-2 text-left font-medium text-text-light">Email</th>
                        <th className="px-3 py-2 text-right font-medium text-text-light">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => {
                        const recipient = inv.invitedUsername
                          ? `@${inv.invitedUsername}`
                          : inv.invitedEmail ?? '—'
                        const emailSent = inv.emailSentAt
                          ? new Date(inv.emailSentAt)
                          : null
                        const cooldownActive = emailSent
                          ? Date.now() - emailSent.getTime() < RESEND_COOLDOWN_MS
                          : false
                        const isThisResending = isResending && resendToken === inv.token

                        return (
                          <tr key={inv.id} className="border-b border-border/50 last:border-0">
                            <td className="px-3 py-2 text-text">{recipient}</td>
                            <td className="px-3 py-2">
                              {emailSent ? (
                                <span className="text-green-400 flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {emailSent.toLocaleDateString('fr-FR')}
                                </span>
                              ) : (
                                <span className="text-text-light">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                disabled={cooldownActive || isThisResending}
                                onClick={() => resend(inv.token)}
                              >
                                <RefreshCw className={`h-3 w-3 ${isThisResending ? 'animate-spin' : ''}`} />
                                {cooldownActive ? 'Patienter' : 'Renvoyer'}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
