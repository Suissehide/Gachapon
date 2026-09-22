import { useQuery } from '@tanstack/react-query'

import { AdminTranslationsApi } from '../api/admin-translations.api.ts'
import { useDataFetching } from '../hooks/useDataFetching.ts'

export type { MissingTranslationEntry } from '../api/admin-translations.api.ts'

export function useAdminMissingTranslations() {
  const query = useQuery({
    queryKey: ['admin', 'translations', 'missing'],
    queryFn: () => AdminTranslationsApi.getMissing(),
  })

  useDataFetching({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
  })

  return query
}
