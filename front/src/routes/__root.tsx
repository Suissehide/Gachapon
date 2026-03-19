import { createRootRoute, Outlet } from '@tanstack/react-router'

import { useAuthStore } from '../stores/auth.store.js'

export const Route = createRootRoute({
  beforeLoad: async () => {
    if (useAuthStore.getState().isLoading) {
      await useAuthStore.getState().fetchMe()
    }
  },
  component: RootComponent,
})

function RootComponent() {
  return <Outlet />
}
