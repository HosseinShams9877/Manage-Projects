/**
 * Seed: 1 admin, 5 employees (4 assigned + 1 unassigned, for the empty
 * notifications case), 2 demo projects (100M + 50M Toman).
 *
 * Project 1 — 100M Toman contract, 70M Toman paid (۲ پرداخت ۳۳ + ۳۷)،
 * 3 installments of 10M Toman covering the remaining 30M (one overdue PARTIAL
 * 4M paid, two PENDING), and one employee payment per assigned employee
 * (۱۰ + ۴ + ۶ + ۹M Toman, roughly 30% of each share). Project 2 — 50M Toman
 * contract, 35M Toman paid, 1 PENDING installment of 15M Toman, no employee
 * payments.
 *
 * Run: npm run db:seed
 */

import { PrismaClient, InstallmentStatus, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * RIAL BigInt → Persian Toman string without unit.
 * Mirrors `formatToman(rial, false)` from core/lib/format.ts so the seeded
 * notification messages are byte-identical to what the module services
 * produce in real flows.
 */
function tomanLabel(rial: bigint): string {
  const toman = rial / 10n;
  const grouped = toman.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  return grouped.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

async function main() {
  console.log("🌱 در حال اجرای سید...");

  const passwordHash = await bcrypt.hash("12345678", 10);

  // --- Users ---------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      name: "مدیر سیستم",
      email: "admin@example.com",
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });

  const employees = await Promise.all(
    [
      { name: "علی رضایی", email: "ali@example.com" },
      { name: "سارا احمدی", email: "sara@example.com" },
      { name: "رضا کریمی", email: "reza@example.com" },
      { name: "مریم حسینی", email: "maryam@example.com" },
    ].map((e) =>
      prisma.user.upsert({
        where: { email: e.email },
        update: {},
        create: {
          name: e.name,
          email: e.email,
          passwordHash,
          role: Role.EMPLOYEE,
          active: true,
        },
      }),
    ),
  );

  // Unassigned employee — used to verify an empty notification inbox and
  // 404 on projects she is not part of.
  await prisma.user.upsert({
    where: { email: "niloofar@example.com" },
    update: {},
    create: {
      name: "نیلوفر فرهادی",
      email: "niloofar@example.com",
      passwordHash,
      role: Role.EMPLOYEE,
      active: true,
    },
  });

  // --- Project 1 (100M Toman = 1,000,000,000 Rial) -------------------------
  const contractPrice = 1_000_000_000n; // Rial → 100M Toman
  const project = await prisma.project.upsert({
    where: { id: "demo-project-1" },
    update: {},
    create: {
      id: "demo-project-1",
      title: "پروژه دمو - ساختمان اداری",
      description: "پروژه نمونه برای آشنایی با سامانه",
      clientCompany: "شرکت نمونه کارفرما",
      contractPrice,
      startDate: new Date("2025-07-23T00:00:00.000Z"), // ۱۴۰۴/۰۵/۰۱
      endDate: new Date("2027-07-23T00:00:00.000Z"), // ۱۴۰۶/۰۵/۰۱
    },
  });

  // --- Assignments (40 / 10 / 20 / 30 = 100) -------------------------------
  for (const [i, share] of [40, 10, 20, 30].entries()) {
    const user = employees[i];
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId: project.id, userId: user.id } },
      update: {},
      create: {
        projectId: project.id,
        userId: user.id,
        sharePercent: share,
        shareAmount: (contractPrice * BigInt(share)) / 100n,
      },
    });
  }

  // --- Employer payments (700M Rial total = 70M Toman → 70% progress) ------
  const employerPayments = [
    { amount: 330_000_000n, date: new Date("2025-08-23T00:00:00.000Z"), note: "پیش‌پرداخت" },
    { amount: 370_000_000n, date: new Date("2025-10-01T00:00:00.000Z"), note: "پرداخت مرحله اول" },
  ];
  for (const p of employerPayments) {
    await prisma.employerPayment.create({
      data: { projectId: project.id, amount: p.amount, date: p.date, note: p.note },
    });
  }

  // --- Installments (3 × 100M Rial = 30M Toman = remaining debt) -----------
  // 1) Overdue and partially paid: 4M of 10M Toman (checking at ۲ ماه پیش).
  // NOTE: the seed starts from this partial state; real flows always mirror a
  // partial payment into EmployerPayment, but the demo ledger is fixed at
  // 70M Toman received, so the 4M has no mirrored payment row by design.
  const partialAmount = 100_000_000n;
  const partialPaid = 40_000_000n;
  await prisma.installment.create({
    data: {
      projectId: project.id,
      dueDate: new Date("2026-09-06T00:00:00.000Z"), // ~۱۴۰۵/۰۶/۱۵ — گذشته
      amount: partialAmount,
      paidAmount: partialPaid,
      remaining: partialAmount - partialPaid,
      status: InstallmentStatus.PARTIAL,
      note: "چک سررسید گذشته",
    },
  });
  // 2) Due next month, 3) due in three months — both PENDING.
  for (const [i, due] of [
    new Date("2026-12-06T00:00:00.000Z"), // ~۱۴۰۵/۰۹/۱۵
    new Date("2027-02-04T00:00:00.000Z"), // ~۱۴۰۵/۱۱/۱۵
  ].entries()) {
    await prisma.installment.create({
      data: {
        projectId: project.id,
        dueDate: due,
        amount: 100_000_000n,
        paidAmount: 0n,
        remaining: 100_000_000n,
        status: InstallmentStatus.PENDING,
        note: `چک شماره ${i + 2}`,
      },
    });
  }

  // --- Employee payments (project 1, ~30% of each share) -------------------
  // Share amounts: 400M / 100M / 200M / 300M Rial (40/10/20/30% of 1B).
  // Paid: 100M / 40M / 60M / 90M Rial → every remainder is visibly non-zero
  // and Ali and Sara have different paid amounts (25% vs 40% of their shares).
  const employeePayments = [
    { user: employees[0], amount: 100_000_000n, date: "2025-09-15", note: "پرداخت پیشرفت کار" },
    { user: employees[1], amount: 40_000_000n, date: "2025-10-20", note: "پرداخت مرحله اول" },
    { user: employees[2], amount: 60_000_000n, date: "2025-11-12", note: "پرداخت پیشرفت کار" },
    { user: employees[3], amount: 90_000_000n, date: "2025-12-01", note: "پرداخت مرحله اول" },
  ];
  for (const p of employeePayments) {
    await prisma.employeePayment.create({
      data: {
        projectId: project.id,
        userId: p.user.id,
        amount: p.amount,
        date: new Date(`${p.date}T00:00:00.000Z`),
        note: p.note,
      },
    });
  }

  // --- Second project (50M Toman = 500,000,000 Rial) ------------------------
  // Only Ali and Maryam are assigned, so employee lists differ per user.
  const price2 = 500_000_000n; // Rial → 50M Toman
  const project2 = await prisma.project.upsert({
    where: { id: "demo-project-2" },
    update: {},
    create: {
      id: "demo-project-2",
      title: "پروژه دمو - بازسازی واحد مسکونی",
      description: "پروژه کوچکتر با دو کارمند",
      clientCompany: "کارفرمای خصوصی",
      contractPrice: price2,
      startDate: new Date("2026-01-21T00:00:00.000Z"), // ۱۴۰۴/۱۱/۰۱
      endDate: new Date("2027-01-21T00:00:00.000Z"), // ۱۴۰۵/۱۱/۰۱
    },
  });

  for (const [i, share] of [60, 40].entries()) {
    const user = employees[[0, 3][i]];
    await prisma.projectAssignment.upsert({
      where: { projectId_userId: { projectId: project2.id, userId: user.id } },
      update: {},
      create: {
        projectId: project2.id,
        userId: user.id,
        sharePercent: share,
        shareAmount: (price2 * BigInt(share)) / 100n,
      },
    });
  }

  // 35M Toman paid (70% progress); the remaining 15M is scheduled as one check.
  await prisma.employerPayment.create({
    data: {
      projectId: project2.id,
      amount: 350_000_000n,
      date: new Date("2026-03-21T00:00:00.000Z"),
      note: "پیش‌پرداخت",
    },
  });

  await prisma.installment.create({
    data: {
      projectId: project2.id,
      dueDate: new Date("2027-01-06T00:00:00.000Z"),
      amount: 150_000_000n,
      paidAmount: 0n,
      remaining: 150_000_000n,
      status: InstallmentStatus.PENDING,
      note: "چک تسویه",
    },
  });

  // --- Notifications --------------------------------------------------------
  // The seed writes rows directly (it never runs through the module services),
  // so it reproduces here exactly what the producers in the payments and
  // employee-payments services would have written for the rows above:
  //  - each employer payment        → one EMPLOYER_PAYMENT row per assigned
  //                                   employee of that project (projectId set)
  //  - each employee payment        → one SYSTEM row for its recipient only
  // Nothing is ever addressed to the admin (they perform the actions) or to an
  // unassigned employee — BR-6. All rows stay unread; mark-read flows are
  // exercised through the API in verification.
  await prisma.notification.deleteMany({});

  for (const p of employerPayments) {
    await prisma.notification.createMany({
      data: employees.map((u) => ({
        userId: u.id,
        type: "EMPLOYER_PAYMENT",
        projectId: project.id,
        message: `پرداخت ${tomanLabel(p.amount)} تومان از پروژه «${project.title}» ثبت شد.`,
      })),
    });
  }

  for (const p of employeePayments) {
    await prisma.notification.create({
      data: {
        userId: p.user.id,
        type: "SYSTEM",
        message: `پرداختی به مبلغ ${tomanLabel(p.amount)} تومان از پروژه «${project.title}» برای شما ثبت شد.`,
      },
    });
  }

  await prisma.notification.createMany({
    data: [employees[0], employees[3]].map((u) => ({
      userId: u.id,
      type: "EMPLOYER_PAYMENT",
      projectId: project2.id,
      message: `پرداخت ${tomanLabel(350_000_000n)} تومان از پروژه «${project2.title}» ثبت شد.`,
    })),
  });

  console.log("✅ سید با موفقیت اجرا شد.");
  console.log(`   ادمین: ${admin.email}`);
  console.log(`   کارمندان: ${employees.map((e) => e.email).join(", ")}, niloofar@example.com`);
}

main()
  .catch((e) => {
    console.error("❌ خطا در سید:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
