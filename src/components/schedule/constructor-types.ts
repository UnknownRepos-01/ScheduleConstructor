export type ListItem = { id: number; name: string; isActive: boolean };
export type ClassItem = { id: number; displayName: string; gradeNumber?: number; letter: string };
export type Teacher = {
  id: number;
  name: string;
  surname: string;
  patronymic: string | null;
  defaultClassroomId?: number | null;
};
export type Subject = { id: number; name: string };
export type Classroom = { id: number; number: string };

export type ScheduleEntry = {
  id: number;
  listId: number;
  classId: number;
  subjectId: number | null;
  teacherId: number | null;
  teacherIds: number[];
  day: number;
  lessonNumber: number;
  classroomIds: number[];
};

export type CellCoordinates = {
  classId: number;
  day: number;
  lessonNumber: number;
};

export type SchedulePayload = {
  listId: number;
  classId: number;
  day: number;
  lessonNumber: number;
  subjectId: number | null;
  teacherId?: number | null;
  teacherIds: number[];
  classroomIds: number[];
};

export type AddLessonForm = {
  subjectId: string;
  teacherIds: number[];
  classroomIds: number[];
};
