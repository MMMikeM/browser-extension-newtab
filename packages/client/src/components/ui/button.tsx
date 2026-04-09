import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { tv } from "tailwind-variants";
import { type StyledProps } from "~/lib/utils";

const buttonVariants = tv({
  base: "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  variants: {
    variant: {
      default: "bg-primary text-primary-foreground hover:bg-primary/80",
      outline: "border-border bg-input/30 text-foreground hover:bg-input/50 aria-expanded:bg-muted",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      ghost:
        "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
      subtle: "text-hint hover:text-foreground",
      link: "text-primary underline-offset-4 hover:underline",
    },
    intent: {
      default: "",
      destructive: "",
    },
    size: {
      default:
        "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
      xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
      sm: "h-8 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
      lg: "h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
    },
    icon: {
      true: "px-0",
    },
  },
  compoundVariants: [
    // Destructive + ghost: transparent bg, red text, red hover bg
    {
      intent: "destructive",
      variant: "ghost",
      class: "bg-transparent text-destructive hover:bg-destructive/20 hover:text-destructive",
    },
    // Destructive + subtle: hint text, red on hover
    { intent: "destructive", variant: "subtle", class: "text-hint hover:text-destructive" },
    // Destructive focus ring override (all variants)
    {
      intent: "destructive",
      class: "focus-visible:border-destructive/40 focus-visible:ring-destructive/40",
    },
    // Icon: square sizing per size tier
    { icon: true, size: "default", class: "size-9" },
    { icon: true, size: "xs", class: "size-6 [&_svg:not([class*='size-'])]:size-3" },
    { icon: true, size: "sm", class: "size-8" },
    { icon: true, size: "lg", class: "size-10" },
  ],
  defaultVariants: {
    variant: "default",
    intent: "default",
    size: "default",
    icon: false,
  },
});

type ButtonProps = StyledProps<ButtonPrimitive.Props, typeof buttonVariants>;

const Button = ({ className, variant, intent, size, icon, ...props }: ButtonProps) => (
  <ButtonPrimitive
    data-slot="button"
    className={buttonVariants({ variant, intent, size, icon, class: className })}
    {...props}
  />
);

export { Button, buttonVariants };
