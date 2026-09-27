import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmailTakenError } from '../../api/guest.api.ts'
import { TOAST_SEVERITY } from '../../constants/ui.constant.ts'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useToast } from '../../hooks/useToast.ts'
import { useGuestUpgrade } from '../../queries/useGuest.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { useAuthDialogStore } from '../../stores/authDialog.store.ts'
import { OAuthButtons, OAuthDivider } from '../auth/oauthSection.tsx'
import { Button } from '../ui/button.tsx'

type LinkIssue = 'account_exists' | 'email_unverified'

function isLinkIssue(value: string | undefined): value is LinkIssue {
  return value === 'account_exists' || value === 'email_unverified'
}

/**
 * Carte de conversion affichée dans `/settings` pour un compte invité :
 * email + mot de passe, ou liaison Google/Discord, pour sauvegarder la
 * progression au-delà du navigateur courant.
 */
export function GuestAccountCard({
  initialLinkError,
}: {
  initialLinkError?: string
}) {
  const { t } = useTranslation(['guest', 'auth'])
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const openLogin = useAuthDialogStore((s) => s.openLogin)
  const upgrade = useGuestUpgrade()
  const [linkIssue, setLinkIssue] = useState<LinkIssue | null>(
    isLinkIssue(initialLinkError) ? initialLinkError : null,
  )
  const [editing, setEditing] = useState(false)

  const form = useAppForm({
    defaultValues: { email: user?.pendingEmail ?? '', password: '' },
    validators: {
      onSubmit: ({ value }) => {
        const fields: Record<string, string> = {}

        if (value.password.length < 8) {
          fields.password = t('auth:registerForm.validation.passwordTooShort')
        }

        if (Object.keys(fields).length > 0) {
          return { fields, form: Object.values(fields)[0] }
        }

        return undefined
      },
    },
    onSubmit: ({ value }) =>
      upgrade.mutateAsync(value).then(
        () => {
          setLinkIssue(null)
          setEditing(false)
        },
        (err: unknown) => {
          if (err instanceof EmailTakenError) {
            setLinkIssue('account_exists')
            return
          }
          // 409 sans code (inscription classique déjà en attente pour cet
          // email), 429 (cooldown), réseau/5xx… : pas de bannière dédiée,
          // mais le message serveur déjà traduit ne doit pas être avalé.
          toast({
            title: t('errors.upgradeTitle'),
            message: (err as Error).message,
            severity: TOAST_SEVERITY.ERROR,
          })
        },
      ),
  })

  const handleLinked = (result: 'linked' | LinkIssue) => {
    if (result === 'linked') {
      setLinkIssue(null)
      toast({ title: t('account.linked'), severity: TOAST_SEVERITY.SUCCESS })
      return
    }
    setLinkIssue(result)
  }

  const pending = user?.pendingEmail && !editing

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold text-text">{t('account.title')}</p>
        <p className="text-sm text-text-light">{t('account.description')}</p>
      </div>

      {linkIssue === 'account_exists' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="mb-2 text-text">{t('account.conflict')}</p>
          <Button size="sm" variant="outline" onClick={openLogin}>
            {t('account.loginInstead')}
          </Button>
        </div>
      )}

      {linkIssue === 'email_unverified' && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-text">{t('account.emailUnverified')}</p>
        </div>
      )}

      {pending ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="text-text">
            {t('account.checkInbox', { email: user?.pendingEmail })}
          </p>
          <Button
            size="sm"
            variant="link"
            className="h-auto p-0"
            onClick={() => setEditing(true)}
          >
            {t('account.changeOrResend')}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-3"
        >
          <form.AppField name="email">
            {(field) => (
              <field.Input
                type="email"
                label={t('auth:registerForm.emailLabel')}
              />
            )}
          </form.AppField>

          <form.AppField name="password">
            {(field) => (
              <field.Password label={t('auth:registerForm.passwordLabel')} />
            )}
          </form.AppField>

          <form.AppForm>
            <form.SubmitButton>{t('account.submit')}</form.SubmitButton>
          </form.AppForm>
        </form>
      )}

      <OAuthDivider />
      <OAuthButtons action="link" onLinked={handleLinked} />
    </div>
  )
}
