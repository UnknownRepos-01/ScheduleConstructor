import type { CellCoordinates } from "@/components/schedule/constructor-types";

export const DAYS = [
  { id: 1, name: "Понедельник" },
  { id: 2, name: "Вторник" },
  { id: 3, name: "Среда" },
  { id: 4, name: "Четверг" },
  { id: 5, name: "Пятница" },
] as const;

export const LESSONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const createCellKey = (classId: number, day: number, lessonNumber: number) =>
  `${classId}:${day}:${lessonNumber}`;

export const createCellDndId = (classId: number, day: number, lessonNumber: number) =>
  `cell:${createCellKey(classId, day, lessonNumber)}`;

export function parseCellDndId(id: string): CellCoordinates | null {
  if (!id.startsWith("cell:")) return null;
  const [, classIdRaw, dayRaw, lessonRaw] = id.split(":");
  const classId = Number(classIdRaw);
  const day = Number(dayRaw);
  const lessonNumber = Number(lessonRaw);
  if (!classId || !day || !lessonNumber) return null;
  return { classId, day, lessonNumber };
}

export function parseEntryDndId(id: string): number | null {
  if (!id.startsWith("entry:")) return null;
  const parsed = Number(id.slice("entry:".length));
  return Number.isFinite(parsed) ? parsed : null;
}
