/**
 * Users module — admin user management (CRUD): create, list, update, delete.
 *
 * The API is admin-only ( enforced in the service layer like every other
 * module). Passwords are hashed with bcrypt in the service and never leave it.
 * Role labels for the UI come from ROLES in core/constants («مدیر»/«کارمند»).
 */

import { z } from "zod";

export const userRoleSchema = z.enum(["ADMIN", "EMPLOYEE"]);

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "نام الزامی است.")
    .max(100, "نام نباید بیشتر از ۱۰۰ کاراکتر باشد."),
  email: z
    .string()
    .trim()
    .min(1, "ایمیل الزامی است.")
    .max(150, "ایمیل نباید بیشتر از ۱۵۰ کاراکتر باشد.")
    .email("ایمیل معتبر نیست."),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد.")
    .max(100, "رمز عبور نباید بیشتر از ۱۰۰ کاراکتر باشد."),
  role: userRoleSchema,
});

/**
 * PATCH payload: every field optional, but still validated when present.
 * An empty/absent password keeps the stored hash (handled in the service).
 */
export const updateUserSchema = createUserSchema.partial();

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;

/** What the API returns for one user. createdAt is an ISO string. */
export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface UserListDTO {
  users: UserDTO[];
  total: number;
}

/** Client-side form values (same shape as the create payload). */
export interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}
