import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-8 text-4xl font-bold tracking-tight">ShadowDark Engine</h1>
      <p className="mb-8 text-lg text-muted-foreground">
        A real-time game management tool for ShadowDark RPG
      </p>
      <div className="flex gap-4">
        <Link
          to="/gm/create"
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-semibold hover:opacity-90 transition"
        >
          Create Game (GM)
        </Link>
        <Link
          to="/player/join"
          className="rounded-lg border border-border px-6 py-3 font-semibold hover:bg-accent transition"
        >
          Join Game (Player)
        </Link>
      </div>
    </main>
  )
}
