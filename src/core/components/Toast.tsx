/** Persian-styled toast helpers backed by react-hot-toast. */

import toast, { type Renderable } from "react-hot-toast";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

function withIcon(message: Renderable, Icon: React.ComponentType<{ className?: string }>) {
  return (
    <span className="flex items-center gap-2">
      <Icon className="w-5 h-5 shrink-0" />
      {message}
    </span>
  );
}

export const persianToast = {
  success: (message: Renderable) =>
    toast.success(withIcon(message, CheckCircle2), {
      style: toastStyle,
      iconTheme: undefined,
    }),
  error: (message: Renderable) =>
    toast.error(withIcon(message, XCircle), { style: toastStyle }),
  loading: (message: Renderable) => toast.loading(withIcon(message, Info), { style: toastStyle }),
  custom: (message: Renderable) => toast(withIcon(message, AlertCircle), { style: toastStyle }),
  dismiss: toast.dismiss,
};

const toastStyle = {
  borderRadius: "10px",
  background: "var(--color-surface)",
  color: "var(--color-foreground)",
  border: "1px solid var(--color-border)",
  fontFamily: "var(--font-sans)",
  fontSize: "14px",
  padding: "12px 16px",
  boxShadow: "var(--shadow-md)",
  direction: "rtl" as const,
};
