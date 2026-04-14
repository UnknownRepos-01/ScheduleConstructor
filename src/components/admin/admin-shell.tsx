"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { AppIcon, type AppIconName } from "@/components/ui/icons";
import { ThemeToggleControl } from "@/components/ui/theme-toggle-control";
import { ROLE_ADMIN } from "@/lib/access";
import { useCurrentUserQuery, useLogoutMutation } from "@/lib/react-query";
import { cn } from "@/lib/cn";

type NavItem = {
  href: string;
  label: string;
  icon: AppIconName;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: "dashboard" },
  { href: "/admin/teachers", label: "Пользователи", icon: "teachers" },
  { href: "/admin/grades", label: "Параллели", icon: "grades" },
  { href: "/admin/classes", label: "Классы", icon: "classes" },
  { href: "/admin/classrooms", label: "Кабинеты", icon: "classrooms" },
  { href: "/admin/subjects", label: "Предметы", icon: "subjects" },
  { href: "/admin/constructor", label: "Конструктор", icon: "constructor" },
];

const publicLinks: NavItem[] = [
  { href: "/schedule", label: "Расписание", icon: "schedule" },
  { href: "/schedule/teachers", label: "Для преподавателей", icon: "user" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logoutMutation = useLogoutMutation();
  const { data: currentUserData } = useCurrentUserQuery();
  const isAdmin = currentUserData?.user?.roleName === ROLE_ADMIN;
  const dynamicNavItems: NavItem[] = isAdmin
    ? [
        ...navItems,
        { href: "/admin/ip-auths", label: "Подтверждение IP", icon: "warning" },
      ]
    : navItems;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen bg-bg-primary">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[100] flex w-[260px] flex-col border-r border-border bg-bg-sidebar py-5 transition-transform duration-300 md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center gap-3 border-b border-border-light px-6 pb-6 pt-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-gradient text-white">
            <AppIcon name="schedule" className="h-5 w-5" strokeWidth={2.2} />
          </div>
          <div>
            <div className="text-base font-bold text-text-primary">Расписание</div>
            <div className="text-[11px] text-text-tertiary">Админ-панель</div>
          </div>
        </div>

        <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-tertiary">
          Управление
        </div>
        {dynamicNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 border-r-[3px] border-transparent px-6 py-2.5 text-sm font-medium text-text-secondary transition duration-150 hover:bg-bg-hover hover:text-text-primary",
              pathname === item.href && "border-accent-primary bg-accent-primary-light text-accent-primary",
            )}
            onClick={() => setSidebarOpen(false)}
          >
            <AppIcon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}

        <div className="mt-4 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-tertiary">
          Публичные страницы
        </div>
        {publicLinks.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-6 py-2.5 text-sm font-medium text-text-secondary transition duration-150 hover:bg-bg-hover hover:text-text-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            <AppIcon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
            <AppIcon name="externalLink" className="ml-auto h-3.5 w-3.5 opacity-50" />
          </a>
        ))}

        <div className="mt-auto border-t border-border-light px-6 pt-4">
          <ThemeToggleControl className="mb-3" />
          <Link
            href="/account"
            className="mb-2 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[13px] font-semibold text-text-secondary transition duration-150 hover:border-accent-primary hover:bg-bg-hover hover:text-text-primary"
          >
            <AppIcon name="user" className="h-4 w-4" />
            Сменить пароль
          </Link>
          <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
            <AppIcon name="logout" className="h-4 w-4" />
            Выйти
          </Button>
        </div>
      </aside>

      <main className="min-h-screen flex-1 px-4 py-5 md:ml-[260px] md:px-8 md:py-7">
        <div className="mb-4 flex md:hidden">
          <Button size="icon" onClick={() => setSidebarOpen((current) => !current)}>
            <AppIcon name="menu" className="h-5 w-5" />
          </Button>
        </div>
        {children}
      </main>

      {sidebarOpen ? <div className="fixed inset-0 z-[99] bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} /> : null}
    </div>
  );
}
