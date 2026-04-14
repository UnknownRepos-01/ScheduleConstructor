"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/hooks/use-theme";

type ThemeToggleControlProps = {
  className?: string;
};

export function ThemeToggleControl({ className }: ThemeToggleControlProps) {
  const { theme, toggleTheme } = useTheme();

  return <ThemeToggle isDark={theme === "dark"} onToggle={toggleTheme} className={className} />;
}

