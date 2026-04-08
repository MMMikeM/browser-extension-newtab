import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/lib/utils";

const initialsAvatarVariants = tv({
  base: "flex shrink-0 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary",
  variants: {
    size: {
      xs: "size-4 text-[8px]",
      sm: "size-5 text-[10px]",
      md: "size-7 text-xs",
    },
  },
  defaultVariants: { size: "xs" },
});

type InitialsAvatarProps = VariantProps<typeof initialsAvatarVariants> & {
  name: string;
  className?: string;
};

export const InitialsAvatar = ({ name, size, className }: InitialsAvatarProps) => (
  <span className={cn(initialsAvatarVariants({ size }), className)} title={name}>
    {name.slice(0, 2).toUpperCase()}
  </span>
);

export { initialsAvatarVariants };
