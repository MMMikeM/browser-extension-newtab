import { Link as RouterLink } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { buttonVariants } from "~/components/ui/button";

const linkVariants = tv({
  extend: buttonVariants,
  variants: {
    variant: {
      inline: "underline underline-offset-2 hover:text-foreground",
    },
  },
  defaultVariants: {
    variant: "inline",
    size: undefined,
  },
});

type LinkProps = Omit<ComponentProps<typeof RouterLink>, "size"> &
  VariantProps<typeof linkVariants>;

const Link = ({ className, variant, size, ...props }: LinkProps) => (
  <RouterLink className={linkVariants({ variant, size, class: className })} {...props} />
);

export { Link, linkVariants };
