import type { AppIconName } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: AppIconName;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({ icon, title, actionLabel, onAction, className }: EmptyStateProps) {
  const hasAction = actionLabel && onAction;

  return (
    <div className={cn("px-6 py-12 text-center text-text-tertiary", className)}>
      <AppIcon name={icon} className="mx-auto mb-3 h-12 w-12 opacity-50" strokeWidth={1.75} />
      <div className="mb-4 text-[15px]">{title}</div>
      {hasAction ? (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
