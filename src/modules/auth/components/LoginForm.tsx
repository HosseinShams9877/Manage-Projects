"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/core/components/Button";
import { Input } from "@/core/components/Input";
import { Card } from "@/core/components/Card";
import { persianToast } from "@/core/components/Toast";
import { loginRequest } from "@/modules/auth/api";
import type { ApiClientError } from "@/core/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const mutation = useMutation({
    mutationFn: () => loginRequest({ email, password }),
    onSuccess: (res) => {
      persianToast.success(`خوش آمدید، ${res.user.name}`);
      router.push(res.user.role === "ADMIN" ? "/admin" : "/me");
      router.refresh();
    },
    onError: (error: ApiClientError) => {
      persianToast.error(error.message ?? "ورود ناموفق بود.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.includes("@")) next.email = "ایمیل معتبر نیست.";
    if (password.length < 1) next.password = "رمز عبور را وارد کنید.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    mutation.mutate();
  };

  return (
    <Card className="w-full max-w-md" noPadding>
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">ورود به سامانه</h1>
        <p className="text-sm text-foreground-muted mt-1">
          برای ادامه، ایمیل و رمز عبور خود را وارد کنید.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
        <Input
          label="ایمیل"
          type="email"
          name="email"
          dir="ltr"
          inputMode="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="رمز عبور"
          type="password"
          name="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
          ورود
        </Button>
        <div className="text-xs text-foreground-subtle bg-surface-2 rounded-md p-3 leading-6">
          <span className="font-medium">حساب‌های پیش‌فرض (سیدی):</span>
          <br />
          مدیر: admin@example.com / 12345678
          <br />
          کارمند: ali@example.com / 12345678
        </div>
      </form>
    </Card>
  );
}
