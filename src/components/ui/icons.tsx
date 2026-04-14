import type { SVGProps } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  BookOpen,
  CircleCheck,
  ClipboardList,
  Clock3,
  DoorOpen,
  GraduationCap,
  Hash,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Pencil,
  Plus,
  School,
  Sun,
  Trash2,
  TriangleAlert,
  UserRound,
  X,
  CalendarDays,
} from "lucide-react";

import { cn } from "@/lib/cn";

const iconRegistry = {
  dashboard: LayoutDashboard,
  teachers: GraduationCap,
  grades: Hash,
  classes: School,
  classrooms: DoorOpen,
  subjects: BookOpen,
  constructor: CalendarDays,
  schedule: ClipboardList,
  user: UserRound,
  logout: LogOut,
  menu: Menu,
  sun: Sun,
  moon: Moon,
  close: X,
  edit: Pencil,
  delete: Trash2,
  add: Plus,
  externalLink: ArrowUpRight,
  check: CircleCheck,
  warning: TriangleAlert,
  saving: Clock3,
} as const satisfies Record<string, LucideIcon>;

export type AppIconName = keyof typeof iconRegistry;

type AppIconProps = Omit<SVGProps<SVGSVGElement>, "name"> & {
  name: AppIconName;
};

export function AppIcon({ name, className, strokeWidth = 2, ...props }: AppIconProps) {
  const Icon = iconRegistry[name];
  return <Icon className={cn("h-4 w-4 shrink-0", className)} strokeWidth={strokeWidth} aria-hidden="true" {...props} />;
}

