import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useAppForm } from '../../hooks/formConfig.tsx'
import { useRegister } from '../../queries/useAuth.ts'
import { Button } from '../ui/button.tsx'
import { OAuthButtons, OAuthDivider } from './oauthSection.tsx'

export function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation('auth')
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
          fields.username = t('registerForm.validation.usernameFormat')
        }

        if (value.password !== value.confirmPassword) {
          fields.confirmPassword = t('registerForm.validation.passwordMismatch')
        }

        if (value.password.length < 8) {
          fields.password = t('registerForm.validation.passwordTooShort')
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
        {(field) => <field.Input label={t('registerForm.usernameLabel')} />}
      </form.AppField>

      <form.AppField name="email">
        {(field) => (
          <field.Input type="email" label={t('registerForm.emailLabel')} />
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => <field.Password label={t('registerForm.passwordLabel')} />}
      </form.AppField>

      <form.AppField name="confirmPassword">
        {(field) => (
          <field.Password label={t('registerForm.confirmPasswordLabel')} />
        )}
      </form.AppField>

      <Button type="submit" className="w-full mt-1" disabled={isPending}>
        {isPending ? t('registerForm.submitPending') : t('registerForm.submit')}
      </Button>

      <OAuthDivider />
      <OAuthButtons action="register" />
    </form>
  )
}
