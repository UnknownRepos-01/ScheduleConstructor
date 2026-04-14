import { AppIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";

type ThemeToggleProps = {
  isDark: boolean;
  onToggle: () => void;
  className?: string;
};

export function ThemeToggle({ isDark, onToggle, className }: ThemeToggleProps) {
  return (
    <div className={cn("flex items-center gap-2 text-[13px] text-text-tertiary", className)}>
      <AppIcon name="sun" className="h-4 w-4" />
      <button
        type="button"
        aria-label="Переключить тему"
        onClick={onToggle}
        className="flex h-[26px] w-12 items-center rounded-full border border-border bg-bg-tertiary px-1 transition duration-150"
      >
        <span
          className={cn(
            "h-[18px] w-[18px] rounded-full bg-accent-gradient shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition duration-300",
            isDark && "translate-x-5",
          )}
        />
      </button>
      <AppIcon name="moon" className="h-4 w-4" />
    </div>
  );
}
