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

// First and last initials, so "Sam Okafor" and "Sarah Murray" don't both read "SA"
const initialsOf = (name: string) => {
  const words = name.trim().split(/\s+/);
  return words.length > 1
    ? `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase()
    : name.slice(0, 2).toUpperCase();
};

export const InitialsAvatar = ({ name, size, className }: InitialsAvatarProps) => (
  <span className={cn(initialsAvatarVariants({ size }), className)} title={name}>
    {initialsOf(name)}
  </span>
);

export { initialsAvatarVariants };
