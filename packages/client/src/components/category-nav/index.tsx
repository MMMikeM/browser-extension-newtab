import { lazy, Suspense, useEffect } from "react";
import { useIsDesk } from "~/lib/hooks/use-is-desk";
import { useNavContext } from "~/lib/state/nav-context";
import { CategorySidebar } from "./CategorySidebar";

export { CATEGORY_DROP_PREFIX } from "./CategorySidebar";

// Only needed where the sidebar doesn't fit, so desktop never loads it
const CategoryMobileSheet = lazy(() => import("./CategoryMobileSheet"));

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
