import { lazy, Suspense, useState } from "react";
import { CategorySidebar } from "./CategorySidebar";

export { CATEGORY_DROP_PREFIX } from "./CategorySidebar";

// Dynamic import — CategoryMobileSheet is only needed on touch devices
const CategoryMobileSheet = lazy(() => import("./CategoryMobileSheet"));

const useIsTouch = () =>
  useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  )[0];

export function CategoryNav() {
  const isTouch = useIsTouch();
  if (isTouch)
    return (
      <Suspense>
        <CategoryMobileSheet />
      </Suspense>
    );
  return <CategorySidebar />;
}
