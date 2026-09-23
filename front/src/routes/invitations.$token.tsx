import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, Loader2, ShieldAlert, Users, X, XCircle } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'

import { LandingNavbar } from '../components/custom/LandingNavbar.tsx'
import { Navbar } from '../components/custom/Navbar.tsx'
import { Button } from '../components/ui/button.tsx'
import { isApiError } from '../libs/httpErrorHandler.ts'
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
  const { t } = useTranslation('auth')
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoadingAuth = useAuthStore((s) => s.isLoading)
  const logout = useAuthStore((s) => s.logout)
  const openLogin = useAuthDialogStore((s) => s.openLogin)

  const {
    data: invitation,
    isLoading,
    error,
  } = useInvitation(isAuthenticated ? token : undefined)
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

  // Le lien d'invitation circule par e-mail et atterrit dans le navigateur
  // tel qu'il est — souvent connecté sur un autre compte. Le back répond 403 ;
  // ici on offre la seule sortie utile : repartir sur le bon compte.
  const wrongAccount = isApiError(error) && error.status === 403

  const handleSwitchAccount = () => {
    void logout().then(openLogin)
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
              {t('invitations.unauthenticated.title')}
            </h1>
            <p className="mb-6 text-text-light">
              {t('invitations.unauthenticated.description')}
            </p>
            <Button onClick={openLogin}>
              {t('invitations.unauthenticated.loginButton')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {isAuthenticated ? <Navbar /> : <LandingNavbar />}
      <main className={isAuthenticated ? 'pt-[var(--topbar-h)]' : 'pt-16'}>
        <div
          className={`flex items-center justify-center px-4 ${
            isAuthenticated
              ? 'min-h-[calc(100vh-var(--topbar-h))]'
              : 'min-h-[calc(100vh-4rem)]'
          }`}
        >
          <div className="w-full max-w-md text-center">
            {(isLoading || isLoadingAuth) && (
              <>
                <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
                <p className="text-text-light">
                  {t('invitations.loadingLabel')}
                </p>
              </>
            )}

            {wrongAccount && (
              <>
                <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-primary" />
                <h1 className="mb-2 text-2xl font-black text-text">
                  {t('invitations.wrongAccount.title')}
                </h1>
                <p className="mb-6 text-text-light">
                  {t('invitations.wrongAccount.description')}
                </p>
                <Button onClick={handleSwitchAccount}>
                  {t('invitations.wrongAccount.switchAccountButton')}
                </Button>
              </>
            )}

            {error && !wrongAccount && (
              <>
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h1 className="mb-2 text-2xl font-black text-text">
                  {t('invitations.notFound.title')}
                </h1>
                <p className="text-text-light">
                  {t('invitations.notFound.description')}
                </p>
              </>
            )}

            {invitation && invitation.status !== 'PENDING' && (
              <>
                <XCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h1 className="mb-2 text-2xl font-black text-text">
                  {t('invitations.unavailable.title')}
                </h1>
                <p className="text-text-light">
                  {invitation.status === 'ACCEPTED' &&
                    t('invitations.unavailable.accepted')}
                  {invitation.status === 'DECLINED' &&
                    t('invitations.unavailable.declined')}
                  {invitation.status === 'CANCELLED' &&
                    t('invitations.unavailable.cancelled')}
                  {invitation.status === 'EXPIRED' &&
                    t('invitations.unavailable.expired')}
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
                    <Trans
                      t={t}
                      i18nKey="invitations.pending.invitedByLead"
                      values={{ username: invitation.invitedBy.username }}
                      components={{ Strong: <strong className="text-text" /> }}
                    />
                  ) : (
                    t('invitations.pending.noInviterLead')
                  )}
                </p>
                <h1 className="mb-6 text-2xl font-black text-text">
                  {invitation.team?.name ??
                    t('invitations.pending.teamFallbackName')}
                </h1>
                <div className="flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={accept.isPending || decline.isPending}
                  >
                    <X className="h-4 w-4" />
                    {t('invitations.pending.declineButton')}
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
                    {t('invitations.pending.joinButton')}
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
