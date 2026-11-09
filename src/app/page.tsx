import { redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(session.role === "ADMIN" ? "/admin" : "/me");
}
