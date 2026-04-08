import { type ComponentProps, type ReactNode } from "react";
import { cn } from "~/lib/utils";
import { SectionLabel } from "~/components/ui/section-label";

type DetailSectionProps = Omit<ComponentProps<"div">, "children"> & {
  label: ReactNode;
  children: ReactNode;
};

export const DetailSection = ({ label, className, children, ...props }: DetailSectionProps) => (
  <div className={cn("flex flex-col gap-2", className)} {...props}>
    <SectionLabel>{label}</SectionLabel>
    {children}
  </div>
);
