/**
 * Users service — admin-only CRUD over the User table.
 *
 * Rules:
 *  - Every function requires an ADMIN session (403 otherwise).
 *  - Emails are unique; the check is explicit so a friendly Persian error is
 *    returned instead of a raw Prisma P2002.
 *  - Passwords: bcrypt-hashed on create and on update only when a new password
 *    is actually provided — an omitted password keeps the stored hash.
 *  - Delete guards: an admin cannot delete their own account, and a user who
 *    still has ProjectAssignment or EmployeePayment rows cannot be removed
 *    (their history must stay auditable).
 */

import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/core/lib/prisma";
import { PersianErrors } from "@/core/lib/api-response";
import type { CreateUserInput, UpdateUserInput, UserDTO, UserListDTO } from "./schema";

type Session = { sub: string; role: "ADMIN" | "EMPLOYEE" };

const BCRYPT_ROUNDS = 10;

function requireAdmin(session: Session) {
  if (session.role !== "ADMIN") throw PersianErrors.forbidden();
}

/** True when another user (not `excludeId`) already holds this email. */
async function emailTakenByAnother(email: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return !!existing && existing.id !== excludeId;
}

function mapUserToDTO(user: {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  createdAt: Date;
}): UserDTO {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

/** List every user (admin only), newest first. */
export async function listUsers(session: Session): Promise<UserListDTO> {
  requireAdmin(session);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return { users: users.map(mapUserToDTO), total: users.length };
}

/** Create a user (admin only) with a hashed password. */
export async function createUser(
  input: CreateUserInput,
  session: Session,
): Promise<UserDTO> {
  requireAdmin(session);

  if (await emailTakenByAnother(input.email)) {
    throw PersianErrors.badRequest("این ایمیل قبلاً ثبت شده است.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const created = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return mapUserToDTO(created);
}

/**
 * Update a user (admin only). Provided fields are applied; an empty/absent
 * password keeps the stored hash.
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput,
  session: Session,
): Promise<UserDTO> {
  requireAdmin(session);

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true },
  });
  if (!existing) throw PersianErrors.notFound("کارمند");

  if (input.email !== undefined && (await emailTakenByAnother(input.email, id))) {
    throw PersianErrors.badRequest("این ایمیل قبلاً ثبت شده است.");
  }

  const data: Prisma.UserUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.email !== undefined) data.email = input.email;
  if (input.role !== undefined) data.role = input.role;
  if (input.password) {
    data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return mapUserToDTO(updated);
}

/**
 * Delete a user (admin only).
 * Guard 1: never your own account. Guard 2: no assignments or employee
 * payments may reference them.
 */
export async function deleteUser(id: string, session: Session): Promise<{ id: string }> {
  requireAdmin(session);

  if (session.sub === id) {
    throw PersianErrors.badRequest("شما نمی‌توانید حساب کاربری خود را حذف کنید.");
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) throw PersianErrors.notFound("کارمند");

  const [assignmentCount, paymentCount] = await Promise.all([
    prisma.projectAssignment.count({ where: { userId: id } }),
    prisma.employeePayment.count({ where: { userId: id } }),
  ]);
  if (assignmentCount > 0 || paymentCount > 0) {
    throw PersianErrors.badRequest(
      "این کارمند در پروژه‌ها یا پرداخت‌ها استفاده شده و قابل حذف نیست.",
    );
  }

  await prisma.user.delete({ where: { id } });
  return { id };
}
