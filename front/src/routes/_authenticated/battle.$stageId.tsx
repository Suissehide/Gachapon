import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/battle/$stageId')({
  component: BattlePage,
})

function BattlePage() {
  const { stageId } = Route.useParams()
  return (
    <div className="p-6">
      <p>Battle stub for stage {stageId}</p>
    </div>
  )
}
