import { useNavigate } from '@tanstack/react-router'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useRegister } from '../../queries/useAuth.ts'
import { Button } from '../ui/button.tsx'
import { OAuthButtons, OAuthDivider } from './oauthSection.tsx'

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const navigate = useNavigate()
  const { registerMutation, isPending } = useRegister()

  const form = useAppForm({
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: ({ value }) => {
        const fields: Record<string, string> = {}

        if (!/^[a-zA-Z0-9_]+$/.test(value.username)) {
          fields.username =
            "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores"
        }

        if (value.password !== value.confirmPassword) {
          fields.confirmPassword = 'Les mots de passe ne correspondent pas'
        }

        if (value.password.length < 8) {
          fields.password =
            'Le mot de passe doit contenir au moins 8 caractères'
        }

        if (Object.keys(fields).length > 0) {
          return { fields, form: Object.values(fields)[0] }
        }

        return undefined
      },
    },
    onSubmit: ({ value }) => {
      registerMutation(
        {
          username: value.username,
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: async () => {
            onSuccess()
            await navigate({
              to: '/pending',
              search: { reason: 'email', email: value.email },
            })
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
      <form.AppField name="username">
        {(field) => <field.Input label="Nom d'utilisateur" />}
      </form.AppField>

      <form.AppField name="email">
        {(field) => <field.Input type="email" label="Email" />}
      </form.AppField>

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
      <OAuthButtons action="register" />
    </form>
  )
}
