import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { Button } from '../../components/ui/button.tsx'
import { useAppForm } from '../../hooks/formConfig.tsx'
import { useLogin, useRegister } from '../../queries/useAuth.ts'

export const Route = createFileRoute('/auth/')({
  component: Index,
})

function Index() {
  const navigate = useNavigate()

  const { loginMutation, isPending: isLoginPending } = useLogin()
  const { registerMutation, isPending: isRegisterPending } = useRegister()

  const [mode, setMode] = useState<'login' | 'register'>('login')

  const loginForm = useAppForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: ({ value }) => {
      loginMutation(
        { email: value.email, password: value.password },
        {
          onSuccess: async () => {
            const redirect = new URLSearchParams(window.location.search).get(
              'redirect',
            )
            await navigate({ to: redirect || '/' })
          },
        },
      )
    },
  })

  const registerForm = useAppForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
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
        return undefined
      },
    },
    onSubmit: ({ value }) => {
      registerMutation(
        {
          email: value.email,
          password: value.password,
          firstName: value.firstName,
          lastName: value.lastName,
        },
        {
          onSuccess: () => {
            setMode('login')
            registerForm.reset()
          },
        },
      )
    },
  })

  const toggleLogin = () => {
    loginForm.reset()
    setMode('login')
  }

  const toggleRegister = () => {
    registerForm.reset()
    setMode('register')
  }

  return (
    <div className="relative overflow-hidden w-full h-screen flex items-center bg-background">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-15%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[130px]" />
        <div className="absolute right-[-10%] bottom-[-5%] h-[450px] w-[450px] rounded-full bg-secondary/8 blur-[110px]" />
        <div className="absolute left-[30%] top-[40%] h-[300px] w-[300px] rounded-full bg-accent/6 blur-[90px]" />
      </div>

      {/* Floating capsule orbs */}
      <div
        className="pointer-events-none absolute left-[8%] top-[20%] h-20 w-20 rounded-full bg-gradient-to-br from-primary/30 to-primary/5 blur-sm float"
      />
      <div
        className="pointer-events-none absolute left-[15%] bottom-[25%] h-12 w-12 rounded-full bg-gradient-to-br from-secondary/30 to-secondary/5 blur-sm float"
        style={{ animationDelay: '-3s' } as React.CSSProperties}
      />
      <div
        className="pointer-events-none absolute left-[25%] top-[55%] h-8 w-8 rounded-full bg-gradient-to-br from-accent/30 to-accent/5 blur-sm float"
        style={{ animationDelay: '-1.5s' } as React.CSSProperties}
      />

      {/* Logo */}
      <div className="absolute top-6 left-6 z-10">
        <span className="text-2xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Gachapon
        </span>
      </div>

      {/* Cards container */}
      <div className="relative z-10 flex-1 flex justify-end pr-8 lg:pr-16">
        {/* Login Card */}
        <div
          className={`w-full max-w-[420px] bg-card/60 flex flex-col px-10 py-9 rounded-2xl border border-border backdrop-blur-xl shadow-2xl shadow-black/30 absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out ${
            mode === 'login'
              ? 'right-8 lg:right-16 opacity-100'
              : 'right-[-500px] opacity-0 pointer-events-none'
          }`}
        >
          <h2 className="text-left w-full text-2xl font-black mb-1 text-foreground">
            Bon retour
          </h2>
          <p className="text-sm text-text-light mb-7">
            Connectez-vous pour continuer votre aventure.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await loginForm.handleSubmit()
            }}
            className="w-full flex flex-col gap-3"
          >
            <loginForm.AppField name="email">
              {(field) => <field.Input type="email" label="Email" />}
            </loginForm.AppField>

            <loginForm.AppField name="password">
              {(field) => <field.Password label="Mot de passe" />}
            </loginForm.AppField>

            <div className="w-full text-right -mt-1">
              <button
                type="button"
                className="cursor-pointer text-xs text-text-light hover:text-primary transition-colors"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isLoginPending}
            >
              {isLoginPending ? 'Connexion...' : "S'identifier"}
            </Button>
          </form>

          <div className="text-sm text-text-light mt-6 text-center">
            Pas encore de compte ?{' '}
            <button
              type="button"
              onClick={toggleRegister}
              className="cursor-pointer text-primary hover:underline font-semibold"
            >
              S'inscrire
            </button>
          </div>
        </div>

        {/* Register Card */}
        <div
          className={`w-full max-w-[420px] bg-card/60 flex flex-col px-10 py-9 rounded-2xl border border-border backdrop-blur-xl shadow-2xl shadow-black/30 absolute top-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out ${
            mode === 'register'
              ? 'right-8 lg:right-16 opacity-100'
              : 'right-[-500px] opacity-0 pointer-events-none'
          }`}
        >
          <h2 className="text-left w-full text-2xl font-black mb-1 text-foreground">
            Créer un compte
          </h2>
          <p className="text-sm text-text-light mb-7">
            Rejoignez la communauté Gachapon.
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault()
              await registerForm.handleSubmit()
            }}
            className="w-full flex flex-col gap-3"
          >
            <registerForm.AppField name="email">
              {(field) => <field.Input label="Email" />}
            </registerForm.AppField>

            <div className="grid grid-cols-2 gap-3">
              <registerForm.AppField name="firstName">
                {(field) => <field.Input label="Prénom" />}
              </registerForm.AppField>

              <registerForm.AppField name="lastName">
                {(field) => <field.Input label="Nom" />}
              </registerForm.AppField>
            </div>

            <registerForm.AppField name="password">
              {(field) => <field.Password label="Mot de passe" />}
            </registerForm.AppField>

            <registerForm.AppField name="confirmPassword">
              {(field) => <field.Password label="Confirmer le mot de passe" />}
            </registerForm.AppField>

            <Button
              type="submit"
              className="w-full mt-2"
              disabled={isRegisterPending}
            >
              {isRegisterPending ? 'Inscription...' : "S'inscrire"}
            </Button>
          </form>

          <div className="text-sm text-text-light mt-6 text-center">
            Déjà un compte ?{' '}
            <button
              type="button"
              onClick={toggleLogin}
              className="cursor-pointer text-primary hover:underline font-semibold"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Index
