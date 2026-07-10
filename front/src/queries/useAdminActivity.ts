import { useInfiniteQuery } from '@tanstack/react-query'

import { AdminActivityApi } from '../api/admin-activity.api.ts'

export function useAdminActivity() {
  return useInfiniteQuery({
    queryKey: ['admin', 'activity'],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      AdminActivityApi.getActivity({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  })
}
