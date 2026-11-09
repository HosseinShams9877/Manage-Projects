import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("ایمیل معتبر نیست."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

export type LoginInput = z.infer<typeof loginSchema>;
