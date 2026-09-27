import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { tv } from "tailwind-variants";
import { buttonVariants } from "~/components/ui/button";
import type { StyledProps } from "~/lib/utils";

const menuItemVariants = tv({
  extend: buttonVariants,
  base: "w-full justify-start gap-2.5 rounded-md touch:h-11 [&_svg:not([class*='text-'])]:text-hint",
  compoundVariants: [
    { intent: "destructive", class: "[&_svg:not([class*='text-'])]:text-current" },
  ],
  defaultVariants: {
    variant: "ghost",
    size: "sm",
  },
});

type MenuItemProps = StyledProps<ButtonPrimitive.Props, typeof menuItemVariants>;

export const MenuItem = ({ className, variant, intent, size, ...props }: MenuItemProps) => (
  <ButtonPrimitive
    data-slot="button"
    className={menuItemVariants({ variant, intent, size, class: className })}
    {...props}
  />
);
