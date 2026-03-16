import { useNavigate } from '@tanstack/react-router'
import { Dialog } from 'radix-ui'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import DiscordIcon from '../../assets/icons/discord.svg?react'
import GoogleIcon from '../../assets/icons/google.svg?react'
import { Button } from '../ui/button.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useLogin, useRegister } from '../../queries/useAuth.ts'

export type AuthTab = 'login' | 'register'

export function AuthDialog({
  open,
  onOpenChange,
  defaultTab = 'login',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTab?: AuthTab
}) {
  const [tab, setTab] = useState<AuthTab>(defaultTab)

  useEffect(() => {
    if (open) { setTab(defaultTab) }
  }, [open, defaultTab])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card/90 shadow-2xl shadow-black/60 backdrop-blur-2xl p-8 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=closed]:slide-out-to-top-[44%] data-[state=open]:slide-in-from-top-[44%]">
          <Dialog.Title className="sr-only">
            {tab === 'login' ? 'Se connecter' : "S'inscrire"}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {tab === 'login' ? 'Connectez-vous à votre compte Gachapon' : 'Créez votre compte Gachapon'}
          </Dialog.Description>

          <Dialog.Close className="absolute right-4 top-4 cursor-pointer rounded-full p-1.5 text-text-light transition-all hover:bg-muted hover:text-text">
            <X className="h-4 w-4" />
          </Dialog.Close>

          <div className="flex rounded-xl bg-muted p-1 mb-7">
            <button
              type="button"
              onClick={() => setTab('login')}
              className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === 'login'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-text-light hover:text-text'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setTab('register')}
              className={`flex-1 cursor-pointer rounded-lg py-2 text-sm font-semibold transition-all ${
                tab === 'register'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-text-light hover:text-text'
              }`}
            >
              S'inscrire
            </button>
          </div>

          {tab === 'login' ? (
            <LoginForm onSuccess={() => onOpenChange(false)} />
          ) : (
            <RegisterForm onSuccess={() => onOpenChange(false)} />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
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
            const redirectTo = new URLSearchParams(window.location.search).get('redirect')
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
    </form>
  )
}

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
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
            onSuccess()
            await navigate({ to: '/pending' })
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
    </form>
  )
}

function OAuthDivider() {
  return (
    <div className="flex items-center gap-3 my-2">
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
  icon: ReactNode
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
