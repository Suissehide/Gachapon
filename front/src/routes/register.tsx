import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'

import DiscordIcon from '../assets/icons/discord.svg?react'
import GoogleIcon from '../assets/icons/google.svg?react'
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
            fields: {
              confirmPassword: 'Les mots de passe ne correspondent pas',
            },
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
        <AuthTabs active="register" />

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

          <Button type="submit" className="w-full mt-1" disabled={isPending}>
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
      </AuthCard>
    </AuthLayout>
  )
}

/* ── Shared sub-components ─────────────────────────────── */

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-20%] top-[-15%] h-[550px] w-[550px] rounded-full bg-primary/9 blur-[140px]" />
        <div className="absolute right-[-15%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-secondary/8 blur-[120px]" />
        <div className="absolute left-[40%] top-[50%] h-[300px] w-[300px] rounded-full bg-accent/5 blur-[90px]" />
      </div>

      <div className="absolute top-6 left-6 z-10">
        <Link to="/">
          <span className="text-xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Gachapon
          </span>
        </Link>
      </div>

      {children}
    </div>
  )
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 w-full max-w-[420px] bg-card/70 backdrop-blur-2xl rounded-2xl border border-border shadow-2xl shadow-black/40 p-8 fade-in-up">
      {children}
    </div>
  )
}

function AuthTabs({ active }: { active: 'login' | 'register' }) {
  return (
    <div className="flex rounded-xl bg-muted p-1 mb-7">
      <Link
        to="/login"
        className={`flex-1 text-center rounded-lg py-2 text-sm font-semibold transition-all ${
          active === 'login'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-text-light hover:text-text'
        }`}
      >
        Se connecter
      </Link>
      <Link
        to="/register"
        className={`flex-1 text-center rounded-lg py-2 text-sm font-semibold transition-all ${
          active === 'register'
            ? 'bg-card text-foreground shadow-sm'
            : 'text-text-light hover:text-text'
        }`}
      >
        S'inscrire
      </Link>
    </div>
  )
}

function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-light font-medium">ou continuer avec</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function OAuthButton({
  href,
  icon,
  label,
  className,
}: {
  href: string
  icon: React.ReactNode
  label: string
  className: string
}) {
  return (
    <a
      href={href}
      className={`flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 hover:-translate-y-0.5 ${className}`}
    >
      {icon}
      {label}
    </a>
  )
}

