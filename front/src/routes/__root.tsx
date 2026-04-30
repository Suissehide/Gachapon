import { createRootRoute, Outlet } from '@tanstack/react-router'

import { NotFoundPage } from '../components/custom/NotFoundPage.tsx'
import { useAuthStore } from '../stores/auth.store.js'

export const Route = createRootRoute({
  beforeLoad: async () => {
    if (useAuthStore.getState().isLoading) {
      await useAuthStore.getState().fetchMe()
    }
  },
  component: RootComponent,
  notFoundComponent: NotFoundPage,
})

function RootComponent() {
  return <Outlet />
}
