import { createFileRoute } from "@tanstack/react-router"
import { ReferencePage } from "@/components/reference/reference-page.tsx"

export const Route = createFileRoute("/reference")({
  component: ReferencePage,
})
