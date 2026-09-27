import { lazy, Suspense, useEffect, useSyncExternalStore } from "react";
import { useNavContext } from "~/lib/state/nav-context";
import { CategorySidebar } from "./CategorySidebar";

export { CATEGORY_DROP_PREFIX } from "./CategorySidebar";

// Dynamic import — CategoryMobileSheet is only needed where the sidebar doesn't fit
const CategoryMobileSheet = lazy(() => import("./CategoryMobileSheet"));

// Mirrors the desk: variant in app.css
const DESK_QUERY = "(pointer: fine) and (min-width: 40rem)";

const subscribeDesk = (onChange: () => void) => {
  const mql = window.matchMedia(DESK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

const useIsDesk = () =>
  useSyncExternalStore(
    subscribeDesk,
    () => window.matchMedia(DESK_QUERY).matches,
    // Prerender the sidebar; CSS hides it below desk
    () => true,
  );

export function CategoryNav() {
  const isDesk = useIsDesk();
  const { setNavOpen } = useNavContext();

  // Otherwise a sheet left open while widening reopens on narrowing
  useEffect(() => {
    if (isDesk) setNavOpen(false);
  }, [isDesk, setNavOpen]);

  if (!isDesk)
    return (
      <Suspense>
        <CategoryMobileSheet />
      </Suspense>
    );
  return <CategorySidebar />;
}
