import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'

import DiscordIcon from '../assets/icons/discord.svg?react'
import GoogleIcon from '../assets/icons/google.svg?react'
import { AuthCard, AuthLayout, OAuthButton, OAuthDivider } from '../components/custom/authLayout.tsx'
import { Button } from '../components/ui/button.tsx'

import { useAppForm } from '../hooks/formConfig.tsx'
import { useLogin } from '../queries/useAuth.ts'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const { loginMutation, isPending } = useLogin()

  const form = useAppForm({
    defaultValues: { email: '', password: '' },
    onSubmit: ({ value }) => {
      loginMutation(
        { email: value.email, password: value.password },
        {
          onSuccess: async () => {
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
            await navigate({ to: redirectTo || '/play' })
          },
        },
      )
    },
  })

  return (
    <AuthLayout>
      <AuthCard>
        <div className="mb-6">
          <span className="text-sm font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent select-none">
            Gachapon
          </span>
          <h2 className="mt-1 text-2xl font-black text-foreground">Bon retour</h2>
          <p className="mt-1 text-sm text-text-light">Connecte-toi pour reprendre ta collection.</p>
        </div>

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
            <Button type="button" variant="link" className="h-auto p-0 text-xs text-text-light">
              Mot de passe oublié ?
            </Button>
          </div>

          <Button type="submit" className="w-full mt-1 cursor-pointer" disabled={isPending}>
            {isPending ? 'Connexion...' : 'Se connecter'}
          </Button>
        </form>

        <OAuthDivider />

        <div className="flex flex-col gap-2.5">
          <OAuthButton
            href="/auth/oauth/google/authorize"
            icon={<GoogleIcon />}
            label="Continuer avec Google"
            className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
          />
          <OAuthButton
            href="/auth/oauth/discord/authorize"
            icon={<DiscordIcon />}
            label="Continuer avec Discord"
            className="bg-[#5865F2] text-white hover:bg-[#4752C4]"
          />
        </div>

        <p className="mt-6 text-center text-sm text-text-light">
          Pas encore de compte ?{' '}
          <Link to="/register" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            S'inscrire
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}
