import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { tv } from "tailwind-variants";
import { buttonVariants } from "~/components/ui/button";
import type { StyledProps } from "~/lib/utils";

const togglePillVariants = tv({
  extend: buttonVariants,
  base: "rounded-full touch:h-8 touch:px-3.5 touch:text-sm",
  variants: {
    selected: {
      true: "bg-primary-selected text-primary",
      false: "text-hint hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "ghost",
    size: "xs",
    selected: false,
  },
});

type TogglePillProps = StyledProps<ButtonPrimitive.Props, typeof togglePillVariants>;

// Renders the primitive directly for the same reason as RevealButton: going through
// <Button> would layer Button's default variant (bg-primary) under unselected pills.
export const TogglePill = ({ selected, className, variant, size, ...props }: TogglePillProps) => (
  <ButtonPrimitive
    data-slot="button"
    className={togglePillVariants({ selected, variant, size, class: className })}
    {...props}
  />
);

export { togglePillVariants };
