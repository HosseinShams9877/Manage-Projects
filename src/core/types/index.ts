import type { Role } from "@/core/lib/auth";

export type { Role };

export interface SessionUserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthMeResponse {
  user: SessionUserDTO;
}
