import { type ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/lib/utils";

const colorDotVariants = tv({
  base: "shrink-0 rounded-full",
  variants: {
    size: {
      sm: "size-1.5",
      md: "size-2",
    },
  },
  defaultVariants: { size: "md" },
});

type ColorDotProps = Omit<ComponentProps<"span">, "children"> &
  VariantProps<typeof colorDotVariants> & {
    color?: string;
  };

export const ColorDot = ({ size, color, className, style, ...props }: ColorDotProps) => (
  <span
    className={cn(colorDotVariants({ size }), className)}
    style={color ? { backgroundColor: color, ...style } : style}
    {...props}
  />
);

export { colorDotVariants };
