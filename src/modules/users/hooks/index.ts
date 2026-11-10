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
  createUser as createUserApi,
  deleteUser as deleteUserApi,
  fetchUsers,
  updateUser as updateUserApi,
} from "../api";
import type { CreateUserInput, UpdateUserInput, UserDTO, UserListDTO } from "../lib/schema";

type MutationOptions<TData, TVars> = Omit<UseMutationOptions<TData, Error, TVars>, "mutationFn">;

/**
 * After any user mutation, the employees overview (built from User rows) and
 * the user list must be refetched. `employees.detail(userId)` is invalidated
 * when the mutated id is known, so the employee page picks up a renamed user.
 */
async function invalidateUsers(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users.all }),
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.balances }),
    ...(userId
      ? [queryClient.invalidateQueries({ queryKey: QUERY_KEYS.employees.detail(userId) })]
      : []),
  ]);
}

/** All users (admin only). */
export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEYS.users.all,
    queryFn: fetchUsers,
  });
}

/** Create a user; invalidates user/employee lists. */
export function useCreateUser(options?: MutationOptions<UserDTO, CreateUserInput>) {
  const queryClient = useQueryClient();
  return useMutation<UserDTO, Error, CreateUserInput>({
    ...options,
    mutationFn: createUserApi,
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateUsers(queryClient);
      persianToast.success("کارمند با موفقیت ایجاد شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "ایجاد کارمند با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

export type UpdateUserVars = { id: string } & UpdateUserInput;

/** Update a user; invalidates user/employee lists and that employee's detail. */
export function useUpdateUser(options?: MutationOptions<UserDTO, UpdateUserVars>) {
  const queryClient = useQueryClient();
  return useMutation<UserDTO, Error, UpdateUserVars>({
    ...options,
    mutationFn: ({ id, ...values }) => updateUserApi(id, values),
    onSuccess: async (data, vars, ctx, context) => {
      await invalidateUsers(queryClient, data.id);
      persianToast.success("اطلاعات کارمند با موفقیت ویرایش شد.");
      options?.onSuccess?.(data, vars, ctx, context);
    },
    onError: (error, vars, ctx, context) => {
      persianToast.error(error.message || "ویرایش کارمند با خطا مواجه شد.");
      options?.onError?.(error, vars, ctx, context);
    },
  });
}

/** Delete a user; invalidates user/employee lists. */
export function useDeleteUser(options?: MutationOptions<{ id: string }, string>) {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, Error, string>({
    ...options,
    mutationFn: deleteUserApi,
    onSuccess: async (data, id, ctx, context) => {
      await invalidateUsers(queryClient, id);
      persianToast.success("کارمند حذف شد.");
      options?.onSuccess?.(data, id, ctx, context);
    },
    onError: (error, id, ctx, context) => {
      persianToast.error(error.message || "حذف کارمند با خطا مواجه شد.");
      options?.onError?.(error, id, ctx, context);
    },
  });
}

export type { UserDTO, UserListDTO };
