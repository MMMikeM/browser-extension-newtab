import { type ReactNode } from "react";
import { cn } from "~/lib/utils";

type TextStackProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  className?: string;
};

export const TextStack = ({ title, subtitle, className }: TextStackProps) => (
  <div className={cn("flex min-w-0 flex-1 flex-col", className)}>
    <span className="truncate text-sm font-medium">{title}</span>
    {subtitle && <span className="text-xs text-hint">{subtitle}</span>}
  </div>
);
