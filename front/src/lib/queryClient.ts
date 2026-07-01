import { QueryClient } from '@tanstack/react-query'

// Single shared QueryClient instance, used by main.tsx (for the React provider)
// and the auth store (to wipe all cached queries on logout so the next account
// never sees the previous account's data).
export const queryClient = new QueryClient()
