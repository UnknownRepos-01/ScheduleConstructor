import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-[3px] border-border border-t-accent-primary",
        className,
      )}
    />
  );
}

export function LoadingState({ label = "Загрузка...", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-12 text-text-tertiary", className)}>
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
