import { cn } from "~/lib/utils";

export const InitialsAvatar = ({
  name,
  className,
}: {
  name: string;
  className?: string;
}) => (
  <span
    className={cn(
      "shrink-0 size-4 rounded-full text-[8px] font-semibold flex items-center justify-center",
      className,
    )}
    title={name}
  >
    {name.slice(0, 2).toUpperCase()}
  </span>
);
