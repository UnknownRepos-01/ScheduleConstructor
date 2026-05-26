"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/field";
import { AppIcon } from "@/components/ui/icons";
import { LoadingState } from "@/components/ui/loading-state";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/hooks/use-theme";
import { cn } from "@/lib/cn";
import { ROLE_TEACHER } from "@/lib/access";
import { useCurrentUserQuery, useLogoutMutation, usePublicScheduleQuery } from "@/lib/react-query";

const DAYS = [
  { id: 1, name: "Понедельник" },
  { id: 2, name: "Вторник" },
  { id: 3, name: "Среда" },
  { id: 4, name: "Четверг" },
  { id: 5, name: "Пятница" },
];

interface ScheduleItem {
  id: number;
  day: number;
  lessonNumber: number;
  classId: number;
  className: string;
  subjectName: string;
  teacherName: string;
  teacherFullName: string;
  teacherNames: string[];
  teacherFullNames: string[];
  classrooms: string[];
  hasChanges: boolean;
}

interface TeacherInfo {
  id: string;
  fullName: string;
  shortName: string;
}

const getTeacherFullNames = (item: ScheduleItem) =>
  item.teacherFullNames?.length ? item.teacherFullNames : item.teacherFullName ? [item.teacherFullName] : [];

const getTeacherShortNames = (item: ScheduleItem) =>
  item.teacherNames?.length ? item.teacherNames : item.teacherName ? [item.teacherName] : [];

const groupLessonsByNumber = (lessons: ScheduleItem[]) =>
  lessons.reduce<Record<number, ScheduleItem[]>>((grouped, lesson) => {
    if (!grouped[lesson.lessonNumber]) grouped[lesson.lessonNumber] = [];
    grouped[lesson.lessonNumber].push(lesson);
    return grouped;
  }, {});

export default function TeacherSchedulePage() {
  const [selectedTeacher, setSelectedTeacher] = useState<string>("all");
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { data: scheduleData, isLoading: isScheduleLoading, isError: isScheduleError } = usePublicScheduleQuery();
  const { data: currentUserData } = useCurrentUserQuery();
  const logoutMutation = useLogoutMutation();

  const schedule = (scheduleData?.schedule ?? []) as ScheduleItem[];
  const listName = scheduleData?.listName ?? "";
  const currentUser = currentUserData?.user;

  const teachers = useMemo(() => {
    const data: TeacherInfo[] = [];
    const seen = new Set<string>();

    schedule.forEach((item) => {
      const fullNames = getTeacherFullNames(item);
      const shortNames = getTeacherShortNames(item);
      fullNames.forEach((fullName, index) => {
        if (!fullName || seen.has(fullName)) return;
        seen.add(fullName);
        data.push({
          id: fullName,
          fullName,
          shortName: shortNames[index] ?? fullName,
        });
      });
    });

    data.sort((a, b) => a.fullName.localeCompare(b.fullName));
    return data;
  }, [schedule]);

  const effectiveSelectedTeacher =
    currentUser?.roleName === ROLE_TEACHER
      ? `${currentUser.surname} ${currentUser.name} ${currentUser.patronymic || ""}`.trim()
      : selectedTeacher;

  const filteredTeachers =
    effectiveSelectedTeacher === "all"
      ? teachers
      : teachers.filter((teacher) => teacher.id === effectiveSelectedTeacher);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      router.push("/");
    } catch {
      alert("Не удалось выйти из системы");
    }
  };

  if (isScheduleLoading) {
    return <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6"><LoadingState /></div>;
  }

  if (isScheduleError || scheduleData?.data === null) {
    return (
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <div className="text-center">
          <h1 className="mb-2 bg-accent-gradient bg-clip-text text-3xl text-transparent">Расписание преподавателей</h1>
          <p className="text-text-tertiary">
            {scheduleData?.data === null ? "Активное расписание пока не опубликовано" : "Не удалось загрузить расписание преподавателей"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 flex items-center gap-2 bg-accent-gradient bg-clip-text text-3xl text-transparent">
            <AppIcon name="teachers" className="h-7 w-7 text-accent-primary" />
            Расписание преподавателей
          </h1>
          <p className="text-sm text-text-tertiary">Лист: {listName}</p>
        </div>

        <div className="flex items-center gap-3">
          <ButtonLink href="/schedule" size="sm">
            <AppIcon name="schedule" className="h-4 w-4" />
            Общее расписание
          </ButtonLink>
          {currentUser ? (
            <ButtonLink href="/account" size="sm">
              <AppIcon name="user" className="h-4 w-4" />
              Управление авторизацией
            </ButtonLink>
          ) : null}
          {currentUser ? (
            <Button onClick={handleLogout} size="sm" className="text-danger">
              <AppIcon name="logout" className="h-4 w-4" />
              Выйти
            </Button>
          ) : null}
          <ThemeToggle isDark={theme === "dark"} onToggle={toggleTheme} />
        </div>
      </div>

      {(!currentUser || currentUser.roleName !== ROLE_TEACHER) ? (
        <div className="mb-6 flex justify-center">
          <Select className="max-w-[350px]" value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
            <option value="all">Все преподаватели</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>
            ))}
          </Select>
        </div>
      ) : null}

      {filteredTeachers.length === 0 ? (
        <Card>
          <EmptyState icon="teachers" title="Для выбранного преподавателя расписание не найдено" />
        </Card>
      ) : (
        filteredTeachers.map((teacher) => {
          const teacherSchedule = schedule.filter((item) => {
            return getTeacherFullNames(item).includes(teacher.id);
          });

          return (
            <Card key={teacher.id} className="mb-6">
              <CardHeader>
                <h3 className="flex items-center gap-2"><AppIcon name="user" className="h-5 w-5 text-text-secondary" />{teacher.fullName}</h3>
                <Badge variant="info">{teacherSchedule.length} занятий</Badge>
              </CardHeader>

              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 border-b border-border bg-bg-tertiary px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">День</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-bg-tertiary px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Урок</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-bg-tertiary px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Предмет</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-bg-tertiary px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Класс</th>
                      <th className="sticky top-0 z-10 border-b border-border bg-bg-tertiary px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.05em] text-text-secondary">Кабинет</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => {
                      const dayLessons = teacherSchedule.filter((item) => item.day === day.id).sort((a, b) => a.lessonNumber - b.lessonNumber);
                      if (dayLessons.length === 0) return null;

                      const groupedByLesson = groupLessonsByNumber(dayLessons);
                      const sortedLessonNumbers = Object.keys(groupedByLesson).map(Number).sort((a, b) => a - b);

                      let dayRowIdx = 0;
                      return sortedLessonNumbers.map((number) => {
                        const lessons = groupedByLesson[number];
                        return lessons.map((lesson, idx) => {
                          const isFirstInDay = dayRowIdx === 0;
                          const isFirstInLesson = idx === 0;
                          dayRowIdx++;

                          return (
                            <tr key={lesson.id} className={cn(lesson.hasChanges && "bg-change-highlight")}>
                              {isFirstInDay ? (
                                <td rowSpan={dayLessons.length} className="border-b border-border-light bg-accent-primary-light px-4 py-3 text-center align-middle font-bold text-accent-primary">
                                  {day.name}
                                </td>
                              ) : null}
                              {isFirstInLesson ? (
                                <td rowSpan={lessons.length} className="border-b border-border-light px-4 py-3 text-center align-middle font-semibold">
                                  {lesson.lessonNumber}
                                </td>
                              ) : null}
                              <td className="border-b border-border-light px-4 py-3 font-medium">{lesson.subjectName}</td>
                              <td className="border-b border-border-light px-4 py-3"><Badge>{lesson.className}</Badge></td>
                              <td className="border-b border-border-light px-4 py-3 text-text-tertiary">{lesson.classrooms.length > 0 ? lesson.classrooms.join(", ") : "—"}</td>
                            </tr>
                          );
                        });
                      });
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}

