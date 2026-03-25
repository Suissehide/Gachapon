import { Link, useNavigate } from '@tanstack/react-router'

import { EmailNotVerifiedError } from '../../api/auth.api.ts'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useLogin } from '../../queries/useAuth.ts'
import { useAuthStore } from '../../stores/auth.store.ts'
import { Button } from '../ui/button.tsx'
import { OAuthButtons, OAuthDivider } from './oauthSection.tsx'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate()
  const { loginMutation, isPending, error } = useLogin()
  const fetchMe = useAuthStore((state) => state.fetchMe)

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    onSubmit: ({ value }) => {
      loginMutation(
        { email: value.email, password: value.password },
        {
          onSuccess: async () => {
            await fetchMe()
            onSuccess()
            const redirectTo = new URLSearchParams(window.location.search).get(
              'redirect',
            )
            await navigate({ to: redirectTo || '/play' })
          },
          onError: async (err) => {
            if (err instanceof EmailNotVerifiedError) {
              await navigate({
                to: '/pending',
                search: { reason: 'email', email: err.email },
              })
              return
            }
          },
        },
      )
    },
  })

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        await form.handleSubmit()
      }}
      className="flex flex-col gap-3"
    >
      <form.AppField name="email">
        {(field) => <field.Input type="email" label="Email" />}
      </form.AppField>

      <form.AppField name="password">
        {(field) => <field.Password label="Mot de passe" />}
      </form.AppField>

      <div className="text-right -mt-1">
        <Link
          to="/forgot-password"
          className="text-xs text-text-light hover:text-primary transition-colors"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center -mb-1">{error.message}</p>
      )}

      <Button type="submit" className="w-full mt-1" disabled={isPending}>
        {isPending ? 'Connexion...' : 'Se connecter'}
      </Button>

      <OAuthDivider />
      <OAuthButtons action="login" />
    </form>
  )
}
