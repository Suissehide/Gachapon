import type { ApiError } from '../libs/httpErrorHandler.ts'
import { useLoaderStore } from '../store/useLoaderStore.ts'
import { useErrorNotification } from './useErrorNotification.ts'
import { useLoading } from './useLoading.ts'

interface UseDataFetchingParams {
  isPending: boolean
  isError: boolean
  error: Error | ApiError | null
}

export const useDataFetching = ({
  isPending,
  isError,
  error,
}: UseDataFetchingParams) => {
  const { setIsLoading } = useLoaderStore()
  useErrorNotification(isError, error)
  useLoading(isPending, setIsLoading)
}
