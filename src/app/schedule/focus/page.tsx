"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/cn";
import type { PublicClassItem, ScheduleItem } from "@/lib/api/services/schedule.service";
import { usePublicScheduleQuery } from "@/lib/react-query/hooks/use-schedule";

const DAYS = [
  { id: 1, name: "Понедельник", short: "Пн" },
  { id: 2, name: "Вторник", short: "Вт" },
  { id: 3, name: "Среда", short: "Ср" },
  { id: 4, name: "Четверг", short: "Чт" },
  { id: 5, name: "Пятница", short: "Пт" },
];

const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8];

const createScheduleCellKey = (classId: number, day: number, lesson: number) => `${classId}:${day}:${lesson}`;

export default function FocusSchedulePage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePublicScheduleQuery();

  const schedule = (data?.schedule ?? []) as ScheduleItem[];
  const classList = (data?.classList ?? []) as PublicClassItem[];

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

  const getCell = (classId: number, day: number, lesson: number): ScheduleItem | undefined =>
    scheduleByCell.get(createScheduleCellKey(classId, day, lesson));

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["publicSchedule"] });
      refetch();
      router.refresh();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient, refetch, router]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <LoadingState label="Загрузка актуального расписания..." />
      </div>
    );
  }

  if (isError || data?.data === null) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="text-center">
          <h1 className="mb-2 bg-accent-gradient bg-clip-text text-3xl text-transparent">Расписание занятий</h1>
          <p className="text-text-tertiary">
            Не удалось загрузить расписание. Попробуйте обновить страницу позже.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border bg-bg-card" style={{ maxHeight: "100vh" }}>
      <table className="w-full border-collapse text-[20px]">
        <thead>
          <tr>
            <th className="sticky top-0 z-10 w-10 border border-border bg-bg-tertiary px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
              День
            </th>
            <th className="sticky top-0 z-10 w-10 border border-border bg-bg-tertiary px-2 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary">
              Урок
            </th>
            {classList.map((classItem) => (
              <th
                key={classItem.id}
                className="sticky top-0 z-10 border border-border bg-bg-tertiary px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.04em] text-text-secondary"
              >
                {classItem.displayName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <React.Fragment key={day.id}>
              {LESSONS.map((lesson, lessonIndex) => (
                <tr key={`${day.id}-${lesson}`}>
                  {lessonIndex === 0 ? (
                    <td
                      rowSpan={LESSONS.length}
                      className="min-w-[44px] border border-border bg-accent-primary-light px-2 py-2 text-center text-[30px] font-bold text-accent-primary [writing-mode:vertical-rl]"
                    >
                      {day.name}
                    </td>
                  ) : null}
                  <td className="w-10 min-w-[10px] border border-border bg-bg-tertiary px-2 py-2 text-center font-semibold text-text-secondary">
                    {lesson}
                  </td>
                  {classList.map((classItem) => {
                    const cell = getCell(classItem.id, day.id, lesson);
                    return (
                      <td
                        key={classItem.id}
                        className={cn(
                          "border border-border p-1",
                          cell?.hasChanges && "border-l-[3px] border-l-warning bg-change-highlight",
                        )}
                      >
                        {cell && cell.subjectName ? (
                          <div className="flex min-h-[50px] flex-col justify-center gap-0.5 px-2 py-1">
                            <div className="text-[12px] font-semibold text-text-primary">{cell.subjectName}</div>
                            {cell.teacherName ? (
                              <div className="text-xs text-text-secondary">{cell.teacherName}</div>
                            ) : null}
                            {cell.classrooms.length > 0 ? (
                              <div className="text-[12px] text-text-tertiary">Каб. {cell.classrooms.join(", ")}</div>
                            ) : null}
                          </div>
                        ) : (
                          <div className="flex min-h-[15px] items-center justify-center px-2 py-1 text-center text-text-tertiary/30">
                            —
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
