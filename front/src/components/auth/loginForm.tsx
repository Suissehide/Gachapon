import { useNavigate } from '@tanstack/react-router'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useLogin } from '../../queries/useAuth.ts'
import { Button } from '../ui/button.tsx'
import { OAuthButtons, OAuthDivider } from './oauthSection.tsx'

export function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate()
  const { loginMutation, isPending } = useLogin()

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    onSubmit: ({ value }) => {
      loginMutation(
        { email: value.email, password: value.password },
        {
          onSuccess: async () => {
            onSuccess()
            const redirectTo = new URLSearchParams(window.location.search).get(
              'redirect',
            )
            await navigate({ to: redirectTo || '/play' })
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
        <button
          type="button"
          className="text-xs text-text-light hover:text-primary transition-colors cursor-pointer"
        >
          Mot de passe oublié ?
        </button>
      </div>

      <Button type="submit" className="w-full mt-1" disabled={isPending}>
        {isPending ? 'Connexion...' : 'Se connecter'}
      </Button>

      <OAuthDivider />
      <OAuthButtons action="login" />
    </form>
  )
}
