import type { HTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const fieldControlClasses =
  "w-full rounded-md border border-border bg-bg-input px-3.5 py-2.5 text-sm text-text-primary outline-none transition duration-150 focus:border-accent-primary focus:ring-4 focus:ring-accent-primary-light/70";

export function FieldGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function FieldLabel({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-[13px] font-semibold uppercase tracking-[0.05em] text-text-secondary",
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        fieldControlClasses,
        "placeholder:text-text-tertiary",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        fieldControlClasses,
        "cursor-pointer pr-9",
        className,
      )}
      {...props}
    />
  );
}
