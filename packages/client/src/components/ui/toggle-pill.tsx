import { tv } from "tailwind-variants";
import { Button, buttonVariants } from "~/components/ui/button";
import type { StyledProps } from "~/lib/utils";
import type { Button as ButtonPrimitive } from "@base-ui/react/button";

const togglePillVariants = tv({
  extend: buttonVariants,
  base: "rounded-full",
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

type TogglePillProps = StyledProps<ButtonPrimitive.Props, typeof togglePillVariants> & {
  selected?: boolean;
};

export const TogglePill = ({ selected, className, variant, size, ...props }: TogglePillProps) => (
  <Button
    className={togglePillVariants({ selected, variant, size, class: className })}
    {...props}
  />
);

export { togglePillVariants };
