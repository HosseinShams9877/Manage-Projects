import { notFound, redirect } from "next/navigation";
import { getSession } from "@/core/lib/auth";
import { Card } from "@/core/components/Card";
import { Badge } from "@/core/components/Badge";
import { ProgressBar } from "@/core/components/ProgressBar";
import { formatToman, toPersianDigits } from "@/core/lib/format";
import { getProject } from "@/modules/projects/lib/service";
import { getEmployeeProjectBalance } from "@/modules/employee-payments/lib/service";
import { ProjectDetailScreen } from "@/modules/projects/components/ProjectDetailScreen";

type Params = { params: Promise<{ id: string }> };

/**
 * /me/projects/[id] — read-only detail of one project the employee is
 * assigned to. `getProject` (service layer) throws 404 for any other project,
 * so an unassigned or unknown id never renders — not even client-side.
 *
 * The my-share card is rendered server-side from the employee's own
 * assignment; other employees' names, percents or amounts never reach this
 * page (the projects mapper strips them for non-admins).
 */
export default async function EmployeeProjectDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "EMPLOYEE") redirect("/admin");

  const { id } = await params;
  if (!id) notFound();

  const employeeSession = { sub: session.sub, role: session.role };

  try {
    await getProject(id, employeeSession);
  } catch {
    notFound();
  }

  const balance = await getEmployeeProjectBalance(id, session.sub);

  return (
    <div className="flex flex-col gap-5">
      <Card title="سهم من در این پروژه" description="درصد سهم، مبلغ سهم و وضعیت تسویه شما.">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <dt className="text-xs text-foreground-muted">درصد سهم من</dt>
            <dd className="text-sm font-bold text-foreground tabular-nums mt-1">
              {toPersianDigits(balance.sharePercent)}٪
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">مبلغ سهم من</dt>
            <dd className="text-sm font-bold text-foreground tabular-nums mt-1">
              {formatToman(balance.shareAmount)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">دریافتی من</dt>
            <dd className="text-sm font-bold text-success tabular-nums mt-1">
              {formatToman(balance.paid)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-foreground-muted">مانده من</dt>
            <dd className="mt-1">
              <Badge tone={BigInt(balance.remaining) <= 0n ? "success" : "warning"}>
                <span className="tabular-nums font-bold">{formatToman(balance.remaining)}</span>
              </Badge>
            </dd>
          </div>
        </dl>
        <div className="mt-5">
          <ProgressBar value={BigInt(balance.paid)} total={BigInt(balance.shareAmount)} />
        </div>
      </Card>

      <ProjectDetailScreen
        id={id}
        basePath="/me/projects"
        canManage={false}
        selfUserId={session.sub}
      />
    </div>
  );
}
