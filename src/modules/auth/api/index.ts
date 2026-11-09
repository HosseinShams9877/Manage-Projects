"use client";

import { api } from "@/core/lib/api-client";
import type { SessionUserDTO } from "@/core/types";

export async function loginRequest(body: { email: string; password: string }): Promise<{
  user: SessionUserDTO;
}> {
  return api.post("/api/auth/login", body);
}

export async function logoutRequest(): Promise<{ success: boolean }> {
  return api.post("/api/auth/logout");
}

export async function fetchMe(): Promise<{ user: SessionUserDTO }> {
  return api.get("/api/me");
}
