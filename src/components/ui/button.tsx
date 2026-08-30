import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-signal text-signal-ink hover:bg-signal-hover font-semibold",
        default:
          "bg-surface-2 text-text border border-line-strong hover:border-faint hover:bg-[#28313d]",
        ghost: "text-muted hover:text-text hover:bg-surface-2",
        danger:
          "text-danger border border-[#4a2b33] hover:bg-[#2c1f24] hover:border-danger",
      },
      size: {
        md: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-[0.8125rem]",
        lg: "h-12 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
