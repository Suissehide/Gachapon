import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/play')({
  component: Home,
})

function Home() {
  return (
    <div className="flex flex-col p-8">
      <h1 className="text-2xl font-bold">Home</h1>
    </div>
  )
}
