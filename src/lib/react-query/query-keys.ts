export const queryKeys = {
  auth: {
    currentUser: ["auth", "current-user"] as const,
  },
  schedule: {
    public: ["schedule", "public"] as const,
    byList: (listId: number) => ["schedule", "list", listId] as const,
    autocomplete: (classId: number, subjectId: number | null, teacherId: number | null) =>
      ["schedule", "autocomplete", classId, subjectId ?? "none", teacherId ?? "none"] as const,
  },
  teachers: {
    all: ["teachers"] as const,
  },
  managers: {
    all: ["managers"] as const,
  },
  grades: {
    all: ["grades"] as const,
  },
  classes: {
    all: ["classes"] as const,
  },
  subjects: {
    all: ["subjects"] as const,
  },
  classrooms: {
    all: ["classrooms"] as const,
  },
  lists: {
    all: ["lists"] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
  },
  security: {
    ipAuths: ["security", "ip-auths"] as const,
    selfPendingIpAuths: ["security", "self-pending-ip-auths"] as const,
  },
  curriculumPlans: {
    all: ["curriculum-plans"] as const,
  },
  teachingAssignments: {
    all: ["teaching-assignments"] as const,
  },
};
