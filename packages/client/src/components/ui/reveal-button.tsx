import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { tv } from "tailwind-variants";
import { buttonVariants } from "~/components/ui/button";
import type { StyledProps } from "~/lib/utils";

const revealButtonVariants = tv({
  extend: buttonVariants,
  // Hover-revealed on desktop; always visible on touch, where there is no hover to reveal it
  base: "opacity-0 transition-[color,opacity] group-hover/row:opacity-100 focus-visible:opacity-100 touch:h-9 touch:px-3 touch:opacity-100",
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

type RevealButtonProps = StyledProps<ButtonPrimitive.Props, typeof revealButtonVariants>;

// Renders the primitive directly: revealButtonVariants already extends the full Button
// class set. Going through <Button> would re-apply Button's own defaults (variant
// "default" = bg-primary) underneath these classes.
export const RevealButton = ({ intent, className, variant, size, ...props }: RevealButtonProps) => (
  <ButtonPrimitive
    data-slot="button"
    className={revealButtonVariants({ intent, variant, size, class: className })}
    {...props}
  />
);

export { revealButtonVariants };
