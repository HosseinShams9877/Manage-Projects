/**
 * Dashboard DTO contracts (Phase 6 §1/§2).
 *
 * Money convention — identical to every other module (docs/00 §7):
 * BigInt RIAL never crosses the wire; every money field is a RIAL **string**
 * and the UI converts to Toman via `formatToman`. Dates are Jalali
 * "YYYY/MM/DD" strings produced in the mapper, never raw ISO.
 */

/** Money = RIAL string (BigInt-safe). */
export type Money = string;

/** Activity source tables — drives the badge tone in the feed UI. */
export type DashboardActivityType =
  | "EMPLOYER_PAYMENT"
  | "EMPLOYEE_PAYMENT"
  | "INSTALLMENT";

/** One merged timeline event (newest first). */
export interface DashboardActivityDTO {
  id: string;
  type: DashboardActivityType;
  /** Short Persian label, e.g. «پرداخت کارفرما». */
  description: string;
  /** RIAL string. */
  amount: Money;
  /** Jalali "YYYY/MM/DD" of the event date (payment date / due date). */
  jalaliDate: string;
  /** Persian relative time, e.g. «۲ ساعت پیش». */
  relativeTime: string;
  projectTitle: string;
  /** Who performed the action (admin name / receiving employee name). */
  actorName?: string;
}

/** Counts for the project-health card. */
export interface ProjectHealthDTO {
  total: number;
  active: number;
  pastEndDate: number;
  withOverdueInstallments: number;
}

/** One row of the top-employees ranking. */
export interface TopEmployeeDTO {
  userId: string;
  name: string;
  /** RIAL string. */
  share: Money;
  /** RIAL string. */
  paid: Money;
  /** RIAL string — share − paid, the sort key (descending). */
  remaining: Money;
}

/** Admin dashboard aggregate (§1). */
export interface AdminDashboardDTO {
  totalProjects: number;
  totalContractValue: Money;
  totalPaidByEmployers: Money;
  totalClientOutstanding: Money;
  totalEmployeeShare: Money;
  totalPaidToEmployees: Money;
  totalEmployeeRemaining: Money;
  /** Employer payments received in the current Jalali month. */
  paidThisMonth: Money;
  /** Employee payments made in the current Jalali month. */
  paidToEmployeesThisMonth: Money;
  /** Jalali month label, e.g. «آبان ۱۴۰۵». */
  currentMonthLabel: string;
  projectHealth: ProjectHealthDTO;
  topEmployees: TopEmployeeDTO[];
  recentActivity: DashboardActivityDTO[];
}

/** One upcoming installment on one of MY projects (read-only, §2). */
export interface MyUpcomingInstallmentDTO {
  id: string;
  projectId: string;
  projectTitle: string;
  /** RIAL string. */
  amount: Money;
  /** RIAL string — still unpaid. */
  remaining: Money;
  status: "PENDING" | "PARTIAL" | "PAID";
  /** Jalali "YYYY/MM/DD" of the due date. */
  jalaliDueDate: string;
}

/** Employee dashboard additions (§2) — the /me page keeps its Phase 5 cards. */
export interface EmployeeDashboardDTO {
  /** RIAL string — EmployeePayments received in the current Jalali month. */
  receivedThisMonth: Money;
  /** Jalali month label, e.g. «آبان ۱۴۰۵». */
  currentMonthLabel: string;
  /** Next ≤3 upcoming installments from my assigned projects. */
  upcomingInstallments: MyUpcomingInstallmentDTO[];
}
