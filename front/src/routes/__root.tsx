import { useEffect } from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { fetchMe, isLoading } = useAuthStore()

  useEffect(() => { void fetchMe() }, [fetchMe])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  return <Outlet />
}
