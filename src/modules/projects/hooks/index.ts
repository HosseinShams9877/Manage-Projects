"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { QUERY_KEYS } from "@/core/constants";
import { persianToast } from "@/core/components/Toast";
import {
  createProject as createProjectApi,
  fetchAssignableEmployees,
  deleteProject as deleteProjectApi,
  fetchProject,
  fetchProjects,
  updateProject as updateProjectApi,
} from "../api";
import type { ProjectDTO, ProjectFormValues } from "../lib/schema";

/** List of projects visible to the current user. */
export function useProjects() {
  return useQuery({
    queryKey: QUERY_KEYS.projects.all,
    queryFn: fetchProjects,
  });
}

/** Single project by id. */
export function useProject(id: string, initialData?: ProjectDTO) {
  return useQuery({
    queryKey: QUERY_KEYS.projects.detail(id),
    queryFn: () => fetchProject(id),
    enabled: !!id,
    initialData,
  });
}

type ProjectMutationOptions<TData, TVars> = Omit<
  UseMutationOptions<TData, Error, TVars>,
  "mutationFn"
>;

/** Create + optimistic-ish invalidation with Persian toasts. */
export function useCreateProject(options?: ProjectMutationOptions<ProjectDTO, ProjectFormValues>) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDTO, Error, ProjectFormValues>({
    ...options,
    mutationFn: createProjectApi,
    onSuccess: async (data, vars, ctx, context) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all });
      persianToast.success("پروژه با موفقیت ساخته شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "ساخت پروژه با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

export function useUpdateProject(
  options?: ProjectMutationOptions<ProjectDTO, { id: string; values: Partial<ProjectFormValues> }>,
) {
  const queryClient = useQueryClient();
  return useMutation<ProjectDTO, Error, { id: string; values: Partial<ProjectFormValues> }>({
    ...options,
    mutationFn: ({ id, values }) => updateProjectApi(id, values),
    onSuccess: async (data, vars, ctx, context) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.detail(vars.id) }),
      ]);
      persianToast.success("پروژه با موفقیت به‌روزرسانی شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "به‌روزرسانی پروژه با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

/** Optimistic delete: remove the card from cache before the server responds. */
export function useDeleteProject(
  options?: ProjectMutationOptions<{ id: string }, string>,
) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string, { snapshot: { projects: ProjectDTO[] } | undefined }>({
    ...options,
    mutationFn: deleteProjectApi,
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.projects.all });
      const snapshot = queryClient.getQueryData<{ projects: ProjectDTO[] }>(
        QUERY_KEYS.projects.all,
      );
      if (snapshot) {
        queryClient.setQueryData(QUERY_KEYS.projects.all, {
          ...snapshot,
          projects: snapshot.projects.filter((p) => p.id !== deletedId),
        });
      }
      return { snapshot };
    },
    onSuccess: async (data, vars, ctx, context) => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all });
      persianToast.success("پروژه حذف شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData(QUERY_KEYS.projects.all, ctx.snapshot);
      }
      persianToast.error(error.message || "حذف پروژه با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects.all });
    },
  });
}

/** Assignable employees (admin assignment editor). */
export function useAssignableEmployees(enabled: boolean) {
  return useQuery({
    queryKey: QUERY_KEYS.employees.all,
    queryFn: fetchAssignableEmployees,
    enabled,
  });
}
