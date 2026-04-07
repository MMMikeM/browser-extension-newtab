import { useState, lazy, Suspense } from "react";
import { CategorySidebar } from "./CategorySidebar";

export { CATEGORY_DROP_PREFIX } from "./CategorySidebar";

const categoryMobileSheetModule = import("./CategoryMobileSheet");
const CategoryMobileSheet = lazy(() => categoryMobileSheetModule);

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
