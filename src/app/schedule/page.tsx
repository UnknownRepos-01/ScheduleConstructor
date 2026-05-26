"use client";

import React, { useMemo } from "react";

import { ButtonLink } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/hooks/use-theme";
import { usePublicScheduleQuery } from "@/lib/react-query";
import { cn } from "@/lib/cn";

const DAYS = [
  { id: 1, name: "Понедельник", short: "Пн" },
  { id: 2, name: "Вторник", short: "Вт" },
  { id: 3, name: "Среда", short: "Ср" },
  { id: 4, name: "Четверг", short: "Чт" },
  { id: 5, name: "Пятница", short: "Пт" },
];

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];

interface ScheduleItem {
  id: number;
  day: number;
  lessonNumber: number;
  classId: number;
  className: string;
  subjectName: string;
  teacherName: string;
  classrooms: string[];
  hasChanges: boolean;
}

interface ClassInfo {
  id: number;
  displayName: string;
}

const createScheduleCellKey = (classId: number, day: number, lesson: number) => `${classId}:${day}:${lesson}`;

export default function PublicSchedulePage() {
  const { theme, toggleTheme } = useTheme();
  const { data, isLoading, isError } = usePublicScheduleQuery();

  const schedule = (data?.schedule ?? []) as ScheduleItem[];
  const classList = (data?.classList ?? []) as ClassInfo[];
  const listName = data?.listName ?? "";
  const emptyScheduleMessage = data?.data === null ? "Активное расписание пока не опубликовано" : null;

  const scheduleByCell = useMemo(() => {
    const map = new Map<string, ScheduleItem>();
    schedule.forEach((item) => {
      const key = createScheduleCellKey(item.classId, item.day, item.lessonNumber);
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return map;
  }, [schedule]);

  const getCell = (classId: number, day: number, lesson: number): ScheduleItem | undefined => {
    return scheduleByCell.get(createScheduleCellKey(classId, day, lesson));
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <LoadingState label="Загрузка актуального расписания..." />
      </div>
    );
  }

  if (isError || emptyScheduleMessage) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="text-center">
          <h1 className="mb-2 bg-accent-gradient bg-clip-text text-3xl text-transparent">Расписание занятий</h1>
          <p className="text-text-tertiary">{emptyScheduleMessage ?? "Не удалось загрузить расписание. Попробуйте обновить страницу позже."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 bg-accent-gradient bg-clip-text text-3xl text-transparent">Расписание занятий</h1>
          <p className="text-sm text-text-tertiary">Лист: {listName}</p>
        </div>
        <div className="flex items-center gap-3">
          <ButtonLink href="/schedule/teachers" size="sm">
            <AppIcon name="teachers" className="h-4 w-4" />
            Версия для преподавателей
          </ButtonLink>
          <ThemeToggle isDark={theme === "dark"} onToggle={toggleTheme} />
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-bg-card" style={{ maxHeight: "calc(100vh - 160px)" }}>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 border border-border bg-bg-tertiary px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">День</th>
              <th className="sticky top-0 z-10 w-10 border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">Урок</th>
              {classList.map((c) => (
                <th key={c.id} className="sticky top-0 z-10 border border-border bg-bg-tertiary px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
                  {c.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((day) => (
              <React.Fragment key={day.id}>
                {LESSONS.map((lesson, li) => {
                  return (
                    <tr key={`${day.id}-${lesson}`}>
                      {li === 0 ? (
                        <td rowSpan={LESSONS.length} className="min-w-[44px] border border-border bg-accent-primary-light px-2 py-2 text-center text-[13px] font-bold text-accent-primary [writing-mode:vertical-rl]">
                          {day.name}
                        </td>
                      ) : null}
                      <td className="w-10 min-w-[40px] border border-border bg-bg-tertiary px-2 py-2 text-center font-semibold text-text-secondary">{lesson}</td>
                      {classList.map((cls) => {
                        const cell = getCell(cls.id, day.id, lesson);
                        return (
                          <td
                            key={cls.id}
                            className={cn(
                              "border border-border p-1",
                              cell?.hasChanges && "border-l-[3px] border-l-warning bg-change-highlight",
                            )}
                          >
                            {cell && cell.subjectName ? (
                              <div className="flex min-h-[60px] flex-col justify-center gap-0.5 px-2 py-1">
                                <div className="text-[13px] font-semibold text-text-primary">{cell.subjectName}</div>
                                {cell.teacherName ? <div className="text-xs text-text-secondary">{cell.teacherName}</div> : null}
                                {cell.classrooms.length > 0 ? <div className="text-[11px] text-text-tertiary">Каб. {cell.classrooms.join(", ")}</div> : null}
                              </div>
                            ) : (
                              <div className="flex min-h-[60px] items-center justify-center px-2 py-1 text-center text-text-tertiary/30">—</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 text-center text-[13px] text-text-tertiary">
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 rounded-[3px] border-2 border-warning bg-change-highlight" />
          Ячейка выделена, если в опубликованном расписании есть изменения
        </span>
      </div>
    </div>
  );
}
