import { useState } from "react";
import { CategorySidebar } from "./CategorySidebar";
import { CategoryMobileSheet } from "./CategoryMobileSheet";

export { CATEGORY_DROP_PREFIX } from "./CategorySidebar";

const useIsTouch = () =>
  useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
  )[0];

export function CategoryNav() {
  const isTouch = useIsTouch();
  if (isTouch) return <CategoryMobileSheet />;
  return <CategorySidebar />;
}
