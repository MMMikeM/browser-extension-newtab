import { type ComponentProps } from "react";
import { cn } from "~/lib/utils";

export const SectionLabel = ({ className, ...props }: ComponentProps<"p">) => (
  <p className={cn("text-sm font-medium text-hint", className)} {...props} />
);
