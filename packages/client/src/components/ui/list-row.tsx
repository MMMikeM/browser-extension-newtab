import { type ComponentProps } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/lib/utils";

const listRowVariants = tv({
  base: "group/row flex items-center px-2 hover:bg-muted",
  variants: {
    size: {
      sm: "gap-2 rounded-md py-1",
      default: "gap-3 rounded-lg py-2",
    },
  },
  defaultVariants: { size: "default" },
});

type ListRowProps = ComponentProps<"div"> & VariantProps<typeof listRowVariants>;

export const ListRow = ({ size, className, ...props }: ListRowProps) => (
  <div className={cn(listRowVariants({ size }), className)} {...props} />
);

export { listRowVariants };
