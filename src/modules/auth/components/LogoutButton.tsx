"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/core/components/Button";
import { persianToast } from "@/core/components/Toast";
import { logoutRequest } from "@/modules/auth/api";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await logoutRequest();
        persianToast.custom("خروج از حساب انجام شد.");
        router.push("/login");
        router.refresh();
      }}
    >
      <LogOut className="w-4 h-4" />
      خروج
    </Button>
  );
}
