export const ROLES = {
  ADMIN: "مدیر",
  EMPLOYEE: "کارمند",
} as const;

export const INSTALLMENT_STATUS = {
  PENDING: "در انتظار",
  PARTIAL: "پرداخت جزئی",
  PAID: "پرداخت شده",
} as const;

export const NOTIFICATION_TYPES = {
  EMPLOYER_PAYMENT: "پرداخت کارفرما",
  SYSTEM: "سیستمی",
} as const;

export const APP_NAME = "سامانه مدیریت پروژه";

/** Query keys centralized so invalidation is predictable. */
export const QUERY_KEYS = {
  projects: {
    all: ["projects"] as const,
    detail: (id: string) => ["projects", id] as const,
  },
  /** @deprecated use QUERY_KEYS.projects.all / .detail */
  project: (id: string) => ["projects", id] as const,
  assignments: (projectId: string) => ["projects", projectId, "assignments"] as const,
  /** Employer payments for one project (Phase 3). */
  payments: {
    byProject: (projectId: string) => ["payments", "project", projectId] as const,
  },
  /** @deprecated use QUERY_KEYS.payments.byProject */
  employerPayments: (projectId?: string) =>
    projectId ? ["employer-payments", projectId] : ["employer-payments"] as const,
  /** Installments/checks for one project (Phase 3). */
  installments: {
    byProject: (projectId: string) => ["installments", "project", projectId] as const,
  },
  /** @deprecated use QUERY_KEYS.installments.byProject */
  installmentsLegacy: (projectId?: string) =>
    projectId ? ["installments", projectId] : ["installments"] as const,
  /** Employee payments to employees, against their project shares (Phase 4). */
  employeePayments: {
    all: ["employee-payments"] as const,
    byUser: (userId: string) => ["employee-payments", "user", userId] as const,
    byProject: (projectId: string) => ["employee-payments", "project", projectId] as const,
    /** Projects an employee is assigned to, with their share/remaining (fix-up). */
    assignedProjects: (userId: string) => ["employee-payments", "assigned-projects", userId] as const,
  },
  /** Employees: assignable list, balances overview, per-employee detail (Phase 4). */
  employees: {
    all: ["employees"] as const,
    balances: ["employees", "balances"] as const,
    detail: (id: string) => ["employees", "detail", id] as const,
  },
  /** Notifications of the current user (Phase 3 write, Phase 5 read/unread UI). */
  notifications: {
    mine: (params?: { unreadOnly?: boolean; limit?: number }) =>
      ["notifications", "mine", params ?? {}] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },
  /** @deprecated use QUERY_KEYS.notifications.mine */
  notificationsLegacy: ["notifications"] as const,
  me: ["me"] as const,
  /** Phase 6 dashboard aggregates. */
  dashboard: {
    admin: ["dashboard", "admin"] as const,
    me: ["dashboard", "me"] as const,
  },
  /** @deprecated use QUERY_KEYS.dashboard.admin */
  dashboardSummary: ["dashboard", "summary"] as const,
} as const;
