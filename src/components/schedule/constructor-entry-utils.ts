"use client";

import type { Classroom, ScheduleEntry, Subject, Teacher } from "@/components/schedule/constructor-types";

export const uniqueNumbers = (values: number[]): number[] =>
  Array.from(new Set(values.filter((value) => Number.isFinite(value))));

export function getEntryTeacherIds(entry: Pick<ScheduleEntry, "teacherId" | "teacherIds">): number[] {
  if (Array.isArray(entry.teacherIds) && entry.teacherIds.length > 0) {
    return uniqueNumbers(entry.teacherIds);
  }
  return entry.teacherId ? [entry.teacherId] : [];
}

export function normalizeScheduleEntry(entry: ScheduleEntry): ScheduleEntry {
  const teacherIds = getEntryTeacherIds(entry);
  return {
    ...entry,
    teacherIds,
    teacherId: teacherIds[0] ?? entry.teacherId ?? null,
    classroomIds: Array.isArray(entry.classroomIds) ? uniqueNumbers(entry.classroomIds) : [],
  };
}

export function normalizeScheduleEntries(value: unknown): ScheduleEntry[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => normalizeScheduleEntry(entry as ScheduleEntry));
}

export function formatTeacherShortName(teacher: Pick<Teacher, "name" | "surname" | "patronymic">): string {
  return `${teacher.surname} ${teacher.name[0]}.${teacher.patronymic ? `${teacher.patronymic[0]}.` : ""}`;
}

export function buildSubjectNameById(subjects: Subject[]): Map<number, string> {
  return new Map(subjects.map((subject) => [subject.id, subject.name]));
}

export function buildTeacherShortNameById(teachers: Teacher[]): Map<number, string> {
  return new Map(teachers.map((teacher) => [teacher.id, formatTeacherShortName(teacher)]));
}

export function buildClassroomNumberById(classrooms: Classroom[]): Map<number, string> {
  return new Map(classrooms.map((classroom) => [classroom.id, classroom.number]));
}

export const createResourceLoadKey = (resourceId: number, day: number, lessonNumber: number): string =>
  `${resourceId}:${day}:${lessonNumber}`;

export function buildTeacherOccupancy(schedule: ScheduleEntry[]): Map<string, number> {
  const occupancy = new Map<string, number>();

  schedule.forEach((entry) => {
    getEntryTeacherIds(entry).forEach((teacherId) => {
      const key = createResourceLoadKey(teacherId, entry.day, entry.lessonNumber);
      occupancy.set(key, (occupancy.get(key) || 0) + 1);
    });
  });

  return occupancy;
}

export function buildClassroomOccupancy(schedule: ScheduleEntry[]): Map<string, number> {
  const occupancy = new Map<string, number>();

  schedule.forEach((entry) => {
    entry.classroomIds.forEach((classroomId) => {
      const key = createResourceLoadKey(classroomId, entry.day, entry.lessonNumber);
      occupancy.set(key, (occupancy.get(key) || 0) + 1);
    });
  });

  return occupancy;
}
