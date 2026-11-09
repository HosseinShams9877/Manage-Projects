# سامانه مدیریت پروژه

سامانه مدیریت پروژه، اقساط و پرداخت‌ها با رابط کاربری فارسی (RTL)، تقویم جلالی
و واحد پولی تومان. ساخته‌شده با Next.js 15 (App Router)، TypeScript (strict)،
React Query 5، Tailwind CSS v4 و Prisma 6.

## فهرست

- [پشته فنی](#پشته-فنی)
- [ساختار پروژه](#ساختار-پروژه)
- [راه‌اندازی محلی](#راه‌اندازی-محلی)
- [حساب‌های دمو (سیدی)](#حساب‌های-دمو-سیدی)
- [متغیرهای محیطی](#متغیرهای-محیطی)
- [اجرای تست نهایی (QA)](#اجرای-تست-نهایی-qa)
- [سوییچ از SQLite به PostgreSQL](#سوییچ-از-sqlite-به-postgresql)
- [دیپلوی روی Vercel](#دیپلوی-روی-vercel)
- [توکن‌های طراحی و دارک‌مود](#توکن‌های-طراحی-و-دارک‌مود)
- [اسکریپت‌های کاربردی](#اسکریپت‌های-کاربردی)
- [مستندات](#مستندات)

---

## پشته فنی

| لایه | فناوری |
| --- | --- |
| فریم‌ورک | Next.js 15 (App Router) + TypeScript strict |
| UI | Tailwind CSS v4 + توکن‌های CSS Variables + `lucide-react` |
| سرور-استیت | TanStack React Query 5 |
| دیتابیس | Prisma 6 + SQLite (توسعه) / PostgreSQL (تولید) |
| احراز هویت | JWT در HttpOnly cookie (`jose` + `bcryptjs`) |
| تاریخ/زمان | `dayjs` + `jalaliday` (تقویم جلالی)، ارقام فارسی |
| اعتبارسنجی | Zod |

---

## ساختار پروژه

```
manage-projects/
├── prisma/
│   ├── schema.prisma             # مدل‌ها: User, Project, ProjectAssignment,
│   │                             #   EmployerPayment, EmployeePayment,
│   │                             #   Installment, Notification
│   ├── migrations/               # مهاجرت‌های SQL (commit شده)
│   └── seed.ts                   # داده‌های نمونه فارسی
├── src/
│   ├── app/                      # App Router
│   │   ├── (auth)/login/         # ورود
│   │   ├── (admin)/admin/        # پنل مدیر (.metadata guard شده)
│   │   ├── (employee)/me/        # پنل کارمند
│   │   ├── api/                  # API Route های نازک (guard → service → response)
│   │   ├── layout.tsx            # RTL + فونت وزیرمتن + دارک‌مود سیستمی
│   │   ├── error.tsx             # مرز خطای سراسری فارسی
│   │   ├── not-found.tsx         # ۴۰۴ فارسی
│   │   └── loading.tsx           # اسکلتون سراسری
│   ├── core/                     # لایه مشترک
│   │   ├── components/           # Button, Card, Input, Modal, Badge,
│   │   │                         #   Toast, Skeleton, EmptyState, ErrorState, …
│   │   ├── lib/                  # prisma, auth (JWT), api-client, api-response,
│   │   │                         #   format (تومان/جلالی/ارقام فارسی)
│   │   ├── constants/            # QUERY_KEYS، welfare وضعیت‌ها، APP_NAME
│   │   └── types/                # SessionUserDTO و انواع مشترک
│   └── modules/                  # ماژول‌های دامنه (هرکدام مستقل)
│       ├── auth/                 # ورود، خروج، session
│       ├── projects/             # CRUD پروژه + سهم‌ها
│       ├── employer-payments/    # پرداخت‌های کارفرما
│       ├── employee-payments/    # پرداخت به کارمندان + موجودی‌ها
│       ├── installments/         # اقساط، وصول، تاریخ سررسید
│       ├── notifications/        # اعلان‌ها + زمان نسبی جلالی
│       └── dashboard/            # داشبورد مدیر و کارمند (Phase 6)
└── docs/                         # مستندات (پایین)
```

**الگوی معماری:** هر ماژول `modules/<feature>` دارای پوشه‌های
`lib/` (schema → mapper → service)، `api/` (تابع fetch)، `hooks/` (React Query)
و `components/` است. API Route ها فقط جلسه را بررسی کرده و کار را به
`lib/service.ts` می‌سپارند. صفحات سرور مستقیماً سرویس را صدا می‌زنند؛ صفحات
کلاینت از hook های ماژول استفاده می‌کنند.

---

## راه‌اندازی محلی

نیازمندی: Node.js ۱۸.۱۸ به بالا.

```bash
# ۱. نصب وابستگی‌ها
npm install

# ۲. متغیرهای محیطی
cp .env.example .env
# سپس JWT_SECRET را با یک رشتهٔ تصادفی جایگزین کنید (openssl rand -base64 32)

# ۳. ساخت دیتابیس + اجرای مهاجرت + سید
npx prisma migrate deploy
npm run db:seed

# ۴. اجرای پروژه (تولیدی، روی پورت ۳۱۰۰)
npm run build
npx next start -p 3100
```

سپس به `http://localhost:3100` بروید.

> روی ماشین‌های با حافظهٔ کم، می‌توانید قبل از `build` تنظیم کنید:
> `NODE_OPTIONS="--max-old-space-size=4096"`.

---

## حساب‌های دمو (سیدی)

رمز همهٔ حساب‌ها: `12345678`

| نقش | ایمیل | دسترسی |
| --- | --- | --- |
| مدیر | `admin@example.com` | `/admin/*` |
| کارمند | `ali@example.com` | `/me/*` |
| کارمند | `sara@example.com` | `/me/*` |
| کارمند | `reza@example.com` | `/me/*` |
| کارمند | `maryam@example.com` | `/me/*` |
| کارمند | `niloofar@example.com` | `/me/*` (بدون پروژه — حالت EmptyState) |

سید شامل: ۱ ادمین، ۵ کارمند، ۲ پروژه دمو (مجاموع ۱۵۰ میلیون تومان)، ۶ سهم،
۳ پرداخت کارفرما (مجاموع ۱۰۵ میلیون تومان)، ۴ پرداخت کارمندی (مجاموع ۲۹ میلیون تومان)،
۴ قسط (شامل یک قسط با پرداخت جزئی و سررسید گذشته) و ۱۴ اعلان است.

---

## متغیرهای محیطی

| نام | الزامی | توضیح |
| --- | :---: | --- |
| `DATABASE_URL` | بله | SQLite: `file:./dev.db` — PostgreSQL: `postgresql://...` |
| `JWT_SECRET` | بله | حداقل ۳۲ کاراکتر؛ با `openssl rand -base64 32` بسازید |
| `NEXT_PUBLIC_APP_NAME` | خیر | نام نمایشی سامانه (پیش‌فرض: «سامانه مدیریت پروژه») |

---

## اجرای تست نهایی (QA)

مرور دستی ۱۲ مرحله‌ای نهایی (ورود، داشبورد مدیر/کارمند، گاردهای نقش، اقساط،
اعلان‌ها، ۴۰۴، خروج، تایپ و بیلد) در
[`docs/03-final-qa.md`](docs/03-final-qa.md) مستند شده و روی یک دیتابیس
کاملاً جدید اجرا شده است (همهٔ مراحل `[OK]`).

برای تکرار آن:

```bash
rm prisma/dev.db
npx prisma migrate deploy && npm run db:seed
npm run build && npx next start -p 3100
# سپس مراحل docs/03-final-qa.md را با curl یا مرورگر اجرا کنید
```

---

## سوییچ از SQLite به PostgreSQL

تمام کوئری‌ها `BigInt` (ریال) و تاریخ ISO استفاده می‌کنند که هر دو در
PostgreSQL پشتیبانی می‌شوند؛ لذا سوییچ فقط سه تغییر نیاز دارد.

**۱) `prisma/schema.prisma`** — کتابخانهٔ datasource را عوض کنید:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

> اگر فیلدی با `Unsupported("...")` دارید، آن را به معادل PostgreSQL تغییر دهید.
> اسکیمای فعلی پروژه هیچ نوع `Unsupported` ندارد.

**۲) مهاجرت جدید بسازید** (فقط در توسعه؛ در تولید از `migrate deploy` استفاده کنید):

```bash
npx prisma migrate dev --name postgres-init
git add prisma/migrations && git commit -m "chore: switch provider to postgresql"
```

**۳) `DATABASE_URL`** را روی Postgres تنظیم کنید:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"
npx prisma generate
npx prisma migrate deploy
```

> هیچ کد اپلیکیشنی تغییری نمی‌کند — لایهٔ Prisma تمام تفاوت‌ها را جذب می‌کند.

---

## دیپلوی روی Vercel

راهنمای گام‌به‌گام کامل در [`docs/04-deploy.md`](docs/04-deploy.md).

چک‌لیست کوتاه:

1. مخزن را به Vercel متصل کنید (Framework: Next.js — خودکار).
2. یک PostgreSQL بسازید (Vercel Postgres یا هر ارائه‌دهندهٔ دیگر) و
   `DATABASE_URL` را در Environment Variables قرار دهید.
3. `JWT_SECRET` را (حداقل ۳۲ کاراکتر) در Environment Variables قرار دهید.
4. `prisma/schema.prisma` را به `provider = "postgresql"` سوییچ کنید،
   `npx prisma migrate dev --name postgres-init` بزنید و پوشهٔ
   `prisma/migrations` را commit کنید.
5. Build Command به‌طور پیش‌فرض `npm run build` است که خودش ابتدا
   `prisma generate` را اجرا می‌کند (در `package.json` تنظیم شده).
6. پس از دیپلوی موفق، یک‌بار migrate و seed کنید:
   `npx prisma migrate deploy && npm run db:seed`
   (با `vercel env pull .env.local` و `--schema` اگر لازم است).

---

## توکن‌های طراحی و دارک‌مود

- تمام رنگ‌ها، شعاع‌ها و سایه‌ها به‌عنوان CSS Variables در `src/app/globals.css`
  هستند (روشن زیر `:root` و تاریک زیر `.dark`). هیچ رنگ hard-codedی در کامپوننت‌ها
  نیست؛ تغییر یک متغیر کل اپلیکیشن را تم می‌کند.
- دارک‌مود از **ترجیح سیستمی** پیروی می‌کند: یک اسکریپت کوچک pre-paint در
  `src/app/layout.tsx` کلاس `.dark` را بر اساس `prefers-color-scheme` تنظیم
  می‌کند. دکمهٔ تغییر تم در اپلیکیشن وجود ندارد.

---

## اسکریپت‌های کاربردی

```bash
npm run dev            # اجرای محلی (پورت ۳۰۰۰)
npm run build          # prisma generate + next build
npm run start          # سرور تولیدی روی پورت ۳۰۰۰
npx prisma studio      # مرور دیتابیس
npm run db:seed        # اجرای مجدد سید
npm run db:reset       # ریست کامل دیتابیس + سید (با احتیاط)
npx tsc --noEmit       # تایپ‌چک
```

---

## مستندات

| سند | محتوا |
| --- | --- |
| [`docs/00-knowledge-layer.md`](docs/00-knowledge-layer.md) | قوانین کسب‌وکار، فرمول‌ها، قانون RIAL/Toman، تاریخ جلالی، تله‌های تکنیکی |
| [`docs/01-roadmap.md`](docs/01-roadmap.md) | نقشه راه فازبندی (Phase 0–6) |
| [`docs/02-architecture.md`](docs/02-architecture.md) | معماری، نقشه کامل پوشه‌ها، قراردادهای کدنویسی |
| [`docs/03-final-qa.md`](docs/03-final-qa.md) | مرور دستی ۱۲ مرحله‌ای نهایی (اجرا شده) |
| [`docs/04-deploy.md`](docs/04-deploy.md) | راهنمای دیپلوی روی Vercel |
