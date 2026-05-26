import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "success" | "danger" | "ghost";
type ButtonSize = "md" | "sm" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-gradient text-white shadow-[0_2px_8px_rgba(79,110,247,0.3)] hover:-translate-y-0.5 hover:bg-accent-gradient-hover hover:text-white hover:shadow-[0_4px_16px_rgba(79,110,247,0.4)]",
  success: "bg-success text-white hover:-translate-y-0.5 hover:brightness-110",
  danger: "bg-danger text-white hover:-translate-y-0.5 hover:brightness-110",
  ghost: "border border-border bg-transparent text-text-secondary hover:border-accent-primary hover:bg-bg-hover hover:text-text-primary",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-10 px-5 py-2.5 text-sm",
  sm: "min-h-8 px-3.5 py-1.5 text-[13px]",
  icon: "h-9 w-9 rounded-sm p-0",
};

const baseButtonClasses =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent font-semibold leading-[1.4] transition duration-150";

type CommonProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps) {
  return (
    <button
      className={cn(
        baseButtonClasses,
        "active:scale-[0.97]",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  className,
  variant = "ghost",
  size = "md",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps) {
  return (
    <a
      className={cn(
        baseButtonClasses,
        "no-underline",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
