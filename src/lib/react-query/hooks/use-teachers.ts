"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CreateTeacherPayload,
  Teacher,
  UpdateTeacherPayload,
  teacherService,
} from "@/lib/api/services/teacher.service";
import { queryKeys } from "@/lib/react-query/query-keys";

export const useTeachersQuery = () =>
  useQuery({
    queryKey: queryKeys.teachers.all,
    queryFn: teacherService.list,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

interface UpdateTeacherVariables {
  id: number;
  payload: UpdateTeacherPayload;
}

export const useCreateTeacherMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTeacherPayload) => teacherService.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teachers.all });
      const previousTeachers = queryClient.getQueryData<Teacher[]>(queryKeys.teachers.all) ?? [];

      const optimisticTeacher: Teacher = {
        id: -Date.now(),
        name: payload.name,
        surname: payload.surname,
        patronymic: payload.patronymic ?? null,
        login: payload.login,
        defaultClassroomId: payload.defaultClassroomId ?? null,
        defaultClassroomNumber: null,
      };

      queryClient.setQueryData<Teacher[]>(queryKeys.teachers.all, [...previousTeachers, optimisticTeacher]);

      return { previousTeachers };
    },
    onError: (_error, _payload, context) => {
      if (context?.previousTeachers) {
        queryClient.setQueryData(queryKeys.teachers.all, context.previousTeachers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.all });
    },
  });
};

export const useUpdateTeacherMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateTeacherVariables) => teacherService.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teachers.all });
      const previousTeachers = queryClient.getQueryData<Teacher[]>(queryKeys.teachers.all) ?? [];

      queryClient.setQueryData<Teacher[]>(
        queryKeys.teachers.all,
        previousTeachers.map((teacher) => (teacher.id === id ? { ...teacher, ...payload } : teacher)),
      );

      return { previousTeachers };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTeachers) {
        queryClient.setQueryData(queryKeys.teachers.all, context.previousTeachers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.all });
    },
  });
};

export const useDeleteTeacherMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => teacherService.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.teachers.all });
      const previousTeachers = queryClient.getQueryData<Teacher[]>(queryKeys.teachers.all) ?? [];

      queryClient.setQueryData<Teacher[]>(
        queryKeys.teachers.all,
        previousTeachers.filter((teacher) => teacher.id !== id),
      );

      return { previousTeachers };
    },
    onError: (_error, _id, context) => {
      if (context?.previousTeachers) {
        queryClient.setQueryData(queryKeys.teachers.all, context.previousTeachers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teachers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.managers.all });
    },
  });
};
