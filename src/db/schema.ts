import { boolean, int, mysqlTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const statuses = mysqlTable("statuses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  number: int("number").notNull(),
  hours: int("hours").notNull(),
});

export const classes = mysqlTable("classes", {
  id: int("id").autoincrement().primaryKey(),
  gradeId: int("grade_id").references(() => grades.id).notNull(),
  letter: varchar("letter", { length: 10 }).notNull(),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  surname: varchar("surname", { length: 255 }).notNull(),
  patronymic: varchar("patronymic", { length: 255 }),
  login: varchar("login", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  classId: int("class_id").references(() => classes.id),
  roleId: int("role_id").references(() => roles.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ipAuths = mysqlTable(
  "ip_auths",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").references(() => users.id).notNull(),
    ip: varchar("ip", { length: 45 }).notNull(),
    statusId: int("status_id").references(() => statuses.id).notNull(),
    deviceName: varchar("device_name", { length: 255 }),
    browser: varchar("browser", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIpUnique: uniqueIndex("ip_auths_user_ip_unique").on(table.userId, table.ip),
  }),
);

export const subjects = mysqlTable("subjects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
});

export const classrooms = mysqlTable("classrooms", {
  id: int("id").autoincrement().primaryKey(),
  number: varchar("number", { length: 50 }).notNull(),
});

export const lists = mysqlTable("lists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
});

export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  listId: int("list_id").references(() => lists.id).notNull(),
  classId: int("class_id").references(() => classes.id).notNull(),
  subjectId: int("subject_id").references(() => subjects.id),
  teacherId: int("teacher_id").references(() => users.id),
  day: int("day").notNull(), // 1=понедельник, 2=вторник, 3=среда, 4=четверг, 5=пятница
  lessonNumber: int("lesson_number").notNull(), // 1-8
});

export const lessonClassrooms = mysqlTable("lesson_classrooms", {
  id: int("id").autoincrement().primaryKey(),
  classroomId: int("classroom_id").references(() => classrooms.id).notNull(),
  scheduleId: int("schedule_id").references(() => schedules.id).notNull(),
});

export const lessonTeachers = mysqlTable(
  "lesson_teachers",
  {
    id: int("id").autoincrement().primaryKey(),
    teacherId: int("teacher_id").references(() => users.id).notNull(),
    scheduleId: int("schedule_id").references(() => schedules.id).notNull(),
  },
  (table) => ({
    lessonTeacherUnique: uniqueIndex("lesson_teachers_schedule_teacher_unique").on(table.scheduleId, table.teacherId),
  }),
);

export const teacherDefaultClassrooms = mysqlTable(
  "teacher_default_classrooms",
  {
    id: int("id").autoincrement().primaryKey(),
    teacherId: int("teacher_id").references(() => users.id).notNull(),
    classroomId: int("classroom_id").references(() => classrooms.id).notNull(),
  },
  (table) => ({
    teacherUnique: uniqueIndex("teacher_default_classrooms_teacher_unique").on(table.teacherId),
  }),
);

export const scheduleChanges = mysqlTable("schedule_changes", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").references(() => schedules.id).notNull(),
  fieldChanged: varchar("field_changed", { length: 50 }).notNull(),
  oldValue: varchar("old_value", { length: 255 }),
  newValue: varchar("new_value", { length: 255 }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});
