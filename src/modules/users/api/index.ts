"use client";

import { api } from "@/core/lib/api-client";
import type {
  CreateUserInput,
  UpdateUserInput,
  UserDTO,
  UserListDTO,
} from "../lib/schema";

/** All users (admin only). */
export async function fetchUsers(): Promise<UserListDTO> {
  return api.get<UserListDTO>("/api/users");
}

/** Create a user (admin only). */
export async function createUser(values: CreateUserInput): Promise<UserDTO> {
  return api.post<UserDTO>("/api/users", values);
}

/** Update a user (admin only); omitted password keeps the stored hash. */
export async function updateUser(
  id: string,
  values: UpdateUserInput,
): Promise<UserDTO> {
  return api.patch<UserDTO>(`/api/users/${id}`, values);
}

/** Delete a user (admin only, with the self/reference guards server-side). */
export async function deleteUser(id: string): Promise<{ id: string }> {
  return api.del<{ id: string }>(`/api/users/${id}`);
}
