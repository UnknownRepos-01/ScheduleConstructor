"use client";

import React from "react";

import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AppIcon, type AppIconName } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { PageHeader } from "@/components/ui/page-header";
import { useDashboardStatsQuery } from "@/lib/react-query";

export default function AdminDashboard() {
  const statsQuery = useDashboardStatsQuery();
  const loading = statsQuery.isLoading;

  if (loading) {
    return <LoadingState />;
  }

  const stats = statsQuery.data ?? {
    teachers: 0,
    classes: 0,
    classrooms: 0,
    subjects: 0,
    grades: 0,
    lists: 0,
  };

  const statCards: Array<{ key: keyof typeof stats; icon: AppIconName; label: string; iconClass: string }> = [
    { key: "teachers", icon: "teachers", label: "Преподаватели", iconClass: "bg-accent-primary-light text-accent-primary" },
    { key: "classes", icon: "classes", label: "Классы", iconClass: "bg-success-light text-success" },
    { key: "classrooms", icon: "classrooms", label: "Кабинеты", iconClass: "bg-warning-light text-warning" },
    { key: "subjects", icon: "subjects", label: "Предметы", iconClass: "bg-bg-badge text-accent-secondary" },
    { key: "grades", icon: "grades", label: "Параллели", iconClass: "bg-accent-primary-light text-accent-primary" },
    { key: "lists", icon: "schedule", label: "Листы расписания", iconClass: "bg-success-light text-success" },
  ] as const;

  return (
    <div>
      <PageHeader title="Панель управления" subtitle="Краткая сводка по основным данным системы и быстрый доступ к ключевым разделам." />

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="flex items-center gap-4 rounded-lg border border-border bg-bg-card p-5 transition duration-150 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${card.iconClass}`}>
              <AppIcon name={card.icon} className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold leading-none">{stats[card.key]}</div>
              <div className="mt-1 text-[13px] text-text-tertiary">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <h3>Быстрые действия</h3>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/admin/constructor" variant="primary">
            <AppIcon name="constructor" className="h-4 w-4" />
            Открыть конструктор
          </ButtonLink>
          <ButtonLink href="/admin/teachers">
            <AppIcon name="teachers" className="h-4 w-4" />
            Преподаватели
          </ButtonLink>
          <ButtonLink href="/admin/classes">
            <AppIcon name="classes" className="h-4 w-4" />
            Классы
          </ButtonLink>
          <ButtonLink href="/schedule" target="_blank" rel="noopener noreferrer">
            <AppIcon name="schedule" className="h-4 w-4" />
            Публичное расписание
            <AppIcon name="externalLink" className="h-3.5 w-3.5" />
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
