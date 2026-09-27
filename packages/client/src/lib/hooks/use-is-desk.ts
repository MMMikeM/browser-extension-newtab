import { useSyncExternalStore } from "react";

// Mirrors the desk: variant in app.css
const DESK_QUERY = "(pointer: fine) and (min-width: 44rem)";

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(DESK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

export const useIsDesk = () =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESK_QUERY).matches,
    // Prerender the sidebar; CSS hides it below desk
    () => true,
  );
