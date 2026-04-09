import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Loader2, Users, X, XCircle } from 'lucide-react'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { Navbar } from '../components/custom/Navbar.tsx'
import { Button } from '../components/ui/button.tsx'
import {
  useAcceptInvitation,
  useDeclineInvitation,
  useInvitation,
} from '../queries/useTeams.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import { useAuthDialogStore } from '../stores/authDialog.store.ts'

export const Route = createFileRoute('/invitations/$token')({
  component: InvitationPage,
})

function InvitationPage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoadingAuth = useAuthStore((s) => s.isLoading)
  const openLogin = useAuthDialogStore((s) => s.openLogin)

  const { data: invitation, isLoading, error } = useInvitation(
    isAuthenticated ? token : undefined,
  )
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitation()

  const handleAccept = () => {
    accept.mutate(token, {
      onSuccess: () => {
        if (invitation?.teamId) {
          void navigate({
            to: '/team/$id',
            params: { id: invitation.teamId },
          })
        } else {
          void navigate({ to: '/team' })
        }
      },
    })
  }

  const handleDecline = () => {
    decline.mutate(token, {
      onSuccess: () => {
        void navigate({ to: '/' })
      },
    })
  }

  // Not authenticated → prompt login
  if (!isLoadingAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <LandingNavbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-primary" />
            <h1 className="mb-2 text-2xl font-black text-text">
              Invitation à une équipe
            </h1>
            <p className="mb-6 text-text-light">
              Connecte-toi pour voir et accepter cette invitation.
            </p>
            <Button onClick={openLogin}>Se connecter</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isAuthenticated ? <Navbar /> : <LandingNavbar />}
      <main className="pt-16">
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="w-full max-w-md text-center">
            {(isLoading || isLoadingAuth) && (
              <>
                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="text-text-light">Chargement de l'invitation…</p>
              </>
            )}

            {error && (
              <>
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h1 className="mb-2 text-2xl font-black text-text">
                  Invitation introuvable
                </h1>
                <p className="text-text-light">
                  Ce lien n'est plus valide ou a expiré.
                </p>
              </>
            )}

            {invitation && invitation.status !== 'PENDING' && (
              <>
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h1 className="mb-2 text-2xl font-black text-text">
                  Invitation indisponible
                </h1>
                <p className="text-text-light">
                  {invitation.status === 'ACCEPTED' &&
                    'Cette invitation a déjà été acceptée.'}
                  {invitation.status === 'DECLINED' &&
                    'Cette invitation a été refusée.'}
                  {invitation.status === 'CANCELLED' &&
                    'Cette invitation a été annulée.'}
                  {invitation.status === 'EXPIRED' &&
                    'Cette invitation a expiré.'}
                </p>
              </>
            )}

            {invitation && invitation.status === 'PENDING' && (
              <div className="rounded-2xl border border-border bg-background/60 p-8 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-secondary text-white">
                  <Users className="h-7 w-7" />
                </div>
                <p className="mb-1 text-sm text-text-light">
                  {invitation.invitedBy ? (
                    <>
                      <strong className="text-text">
                        @{invitation.invitedBy.username}
                      </strong>{' '}
                      t'invite à rejoindre
                    </>
                  ) : (
                    "Tu es invité(e) à rejoindre"
                  )}
                </p>
                <h1 className="mb-6 text-2xl font-black text-text">
                  {invitation.team?.name ?? 'une équipe'}
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={accept.isPending || decline.isPending}
                  >
                    <X className="h-4 w-4" />
                    Refuser
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={accept.isPending || decline.isPending}
                  >
                    {accept.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Rejoindre l'équipe
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
