import { useMutation } from '@tanstack/react-query'

import { AuthApi } from '../api/auth.api.ts'
import { AUTH_MESSAGES } from '../constants/message.constant.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'
import { useAuthStore } from '../stores/auth.store.ts'
import type { LoginInput, RegisterInput } from '../types/auth.ts'

// * QUERIES

// * MUTATIONS

export const useLogin = () => {
  const fetchMe = useAuthStore((state) => state.fetchMe)

  const {
    mutate: loginMutation,
    data: credentials,
    isPending,
    error,
    isError,
  } = useMutation({
    mutationFn: async ({ email, password }: LoginInput) => {
      return await AuthApi.login(email, password)
    },
    onSuccess: async () => {
      await fetchMe()
    },
    retry: 0,
  })

  const errorMessageText =
    isError && error instanceof Error
      ? error.message
      : AUTH_MESSAGES.ERROR_FETCHING

  useDataFetching({
    isPending,
    isError,
    error,
    errorMessage: errorMessageText,
  })

  return { loginMutation, credentials, isPending, error, errorMessageText }
}

export const useRegister = () => {
  const {
    mutate: registerMutation,
    isPending,
    error,
    isError,
  } = useMutation({
    mutationFn: async (registerInput: RegisterInput) => {
      return await AuthApi.register(registerInput)
    },
    retry: 0,
  })

  const errorMessageText =
    isError && error instanceof Error
      ? error.message
      : AUTH_MESSAGES.ERROR_FETCHING

  useDataFetching({
    isPending,
    isError,
    error,
    errorMessage: errorMessageText,
  })

  return { registerMutation, isPending, error, errorMessageText }
}
