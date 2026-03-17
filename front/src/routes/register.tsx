import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'

import DiscordIcon from '../assets/icons/discord.svg?react'
import GoogleIcon from '../assets/icons/google.svg?react'
import { AuthCard, AuthLayout, OAuthButton, OAuthDivider } from '../components/custom/authLayout.tsx'
import { Button } from '../components/ui/button.tsx'
import { useAppForm } from '../hooks/formConfig.tsx'
import { useRegister } from '../queries/useAuth.ts'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createFileRoute('/register')({
  beforeLoad: () => {
    if (useAuthStore.getState().isAuthenticated) {
      throw redirect({ to: '/play' })
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const { registerMutation, isPending } = useRegister()

  const form = useAppForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        if (value.password !== value.confirmPassword) {
          return {
            form: 'Les mots de passe ne correspondent pas',
            fields: { confirmPassword: 'Les mots de passe ne correspondent pas' },
          }
        }
        if (value.password.length < 8) {
          return {
            fields: { password: 'Le mot de passe doit contenir au moins 8 caractères' },
          }
        }
        return undefined
      },
    },
    onSubmit: ({ value }) => {
      registerMutation(
        {
          email: value.email,
          firstName: value.firstName,
          lastName: value.lastName,
          password: value.password,
        },
        {
          onSuccess: async () => {
            await navigate({ to: '/pending' })
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
          <h2 className="mt-1 text-2xl font-black text-foreground">Crée ton compte</h2>
          <p className="mt-1 text-sm text-text-light">Rejoins la communauté et commence à collecter.</p>
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

          <div className="grid grid-cols-2 gap-3">
            <form.AppField name="firstName">
              {(field) => <field.Input label="Prénom" />}
            </form.AppField>
            <form.AppField name="lastName">
              {(field) => <field.Input label="Nom" />}
            </form.AppField>
          </div>

          <form.AppField name="password">
            {(field) => <field.Password label="Mot de passe" />}
          </form.AppField>

          <form.AppField name="confirmPassword">
            {(field) => <field.Password label="Confirmer le mot de passe" />}
          </form.AppField>

          <Button type="submit" className="w-full mt-1 cursor-pointer" disabled={isPending}>
            {isPending ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>

        <OAuthDivider />

        <div className="flex flex-col gap-2.5">
          <OAuthButton
            href="/auth/oauth/google/authorize"
            icon={<GoogleIcon />}
            label="S'inscrire avec Google"
            className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50"
          />
          <OAuthButton
            href="/auth/oauth/discord/authorize"
            icon={<DiscordIcon />}
            label="S'inscrire avec Discord"
            className="bg-[#5865F2] text-white hover:bg-[#4752C4]"
          />
        </div>

        <p className="mt-6 text-center text-sm text-text-light">
          Déjà un compte ?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80 transition-colors">
            Se connecter
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  )
}
