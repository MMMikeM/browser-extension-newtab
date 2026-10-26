import { createFileRoute } from "@tanstack/react-router";

// The search layout shows the field and results; this only marks no task being open
export const Route = createFileRoute("/search/")({
  component: () => null,
});
