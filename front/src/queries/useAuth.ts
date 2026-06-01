import { useMutation } from '@tanstack/react-query'

import { AuthApi } from '../api/auth.api.ts'
import { TOAST_SEVERITY } from '../constants/ui.constant.ts'
import { useToast } from '../hooks/useToast.ts'
import type { LoginInput, RegisterInput } from '../types/auth.ts'

// * QUERIES

// * MUTATIONS

export const useLogin = () => {
  const { toast } = useToast()

  const {
    mutate: loginMutation,
    data: credentials,
    isPending,
    error,
  } = useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      return await AuthApi.login(email, password)
    },
    onError: (error) => {
      toast({
        title: 'Erreur de connexion',
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
    retry: 0,
  })

  return { loginMutation, credentials, isPending, error }
}

export const useRegister = () => {
  const { toast } = useToast()

  const { mutate: registerMutation, isPending } = useMutation({
    mutationFn: async (registerInput: RegisterInput) => {
      return await AuthApi.register(registerInput)
    },
    onError: (error) => {
      toast({
        title: "Erreur lors de l'inscription",
        message: error.message,
        severity: TOAST_SEVERITY.ERROR,
      })
    },
    retry: 0,
  })

  return { registerMutation, isPending }
}

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (token: string) => AuthApi.verifyEmail(token),
    retry: 0,
  })

export const useResendVerification = () =>
  useMutation({
    mutationFn: (email: string) => AuthApi.resendVerification(email),
    retry: 0,
  })

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => AuthApi.forgotPassword(email),
    retry: 0,
  })

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({
      token,
      newPassword,
    }: {
      token: string
      newPassword: string
    }) => AuthApi.resetPassword(token, newPassword),
    retry: 0,
  })
