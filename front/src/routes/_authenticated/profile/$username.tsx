import { createFileRoute } from '@tanstack/react-router'

import { ArcadeProfile } from '../../../components/profile/arcade/ArcadeProfile'

export const Route = createFileRoute('/_authenticated/profile/$username')({
  component: ProfilePage,
})

function ProfilePage() {
  const { username } = Route.useParams()
  return <ArcadeProfile username={username} />
}
