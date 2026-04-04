import { ClientOnly, createRootRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { PendingShell } from "~/AppBackground";
import { getBuildTarget } from "~/lib/build-target";



const getRootComponent = () => {
  if (getBuildTarget() === "server") return PendingShell
  const Root = lazy(() => import("~/root"))
  return () => <ClientOnly fallback={<PendingShell />}><Root /></ClientOnly>
} 

export const Route = createRootRoute({
  component: getRootComponent()
});
