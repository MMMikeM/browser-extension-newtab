import { tv, type VariantProps } from "tailwind-variants";
import { Button, buttonVariants } from "~/components/ui/button";
import type { StyledProps } from "~/lib/utils";
import type { Button as ButtonPrimitive } from "@base-ui/react/button";

const revealButtonVariants = tv({
  extend: buttonVariants,
  base: "opacity-0 transition-[color,opacity] group-hover/row:opacity-100",
  variants: {
    intent: {
      danger: "text-hint hover:text-destructive",
      neutral: "text-hint hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "subtle",
    size: "xs",
    intent: "danger",
  },
});

type RevealButtonProps = StyledProps<ButtonPrimitive.Props, typeof revealButtonVariants> &
  VariantProps<typeof revealButtonVariants>;

export const RevealButton = ({ intent, className, variant, size, ...props }: RevealButtonProps) => (
  <Button
    className={revealButtonVariants({ intent, variant, size, class: className })}
    {...props}
  />
);

export { revealButtonVariants };
