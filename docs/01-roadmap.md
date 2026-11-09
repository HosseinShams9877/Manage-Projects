# ۰۱ — نقشه راه اجرایی (Roadmap)

سند مرجع فازبندی اجرا. هر فاز پس از تأیید کاربر آغاز می‌شود.

---

## Phase 0 — لایه دانش و طراحی (همین فاز)
**خروجی‌ها:**
- `docs/00-knowledge-layer.md`
- `docs/01-roadmap.md` (این سند)
- `docs/02-architecture.md`
- `prisma/schema.prisma`

**معیار پذیرش:** سندها و اسکیما نوشته شده و با مدل دامنه منطبق باشند.

---

## Phase 1 — زیربنای فنی (Foundation)
**فایل‌ها:**
- پیکربندی: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/globals.css` (تمام توکن‌های طراحی + RTL + فونت وزیر), `.env.example`, `.env`
- `prisma/schema.prisma`, `prisma/seed.ts`, `src/core/lib/prisma.ts`
- `src/core/lib/format.ts` — ارقام فارسی، ارقام فارسی، تاریخ جلالی، واحد پول
- `src/core/lib/query-client.ts`, `src/app/providers.tsx` (React Query Provider + Toaster)
- `src/core/lib/auth.ts` — JWT کوکی (jose) + هش bcrypt
- `src/core/lib/api-response.ts` — پاکت خطای استاندارد `{ ok, data | error }`
- `src/middleware.ts` — محافظت `/admin/*` و `/me/*` بر اساس نقش
- `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/me/route.ts`
- `src/app/(auth)/login/page.tsx`
- `src/app/(admin)/admin/page.tsx` (پوسته خالی)
- `src/app/(employee)/me/page.tsx` (پوسته خالی)
- کامپوننت‌های پایه: `Button`, `Input`, `Card`, `Modal`, `Table`, `ProgressBar`, `Badge`, `Toast` helper
- `JalaliDatePicker` (روز/ماه/سال انتخابگر ساده فارسی)
- `README.md` (فارسی)

**معیار پذیرش:**
- `npm run dev` بدون خطا بالا بیاید.
- ورود با اکانت‌های سیدی (admin + employee) موفق باشد و ریدایرکت طبق نقش انجام شود.
- middleware مسیرهای محافظت‌شده را برای کاربر ناشناس/نابجا مسدود کند.

---

## Phase 2 — ماژول پروژه‌ها
- `src/modules/projects/{schema,api,lib,components,hooks,types}`
- مسیرهای API: `POST/GET /api/projects`, `GET/PATCH/DELETE /api/projects/:id`
- تخصیص‌ها: `POST/GET/DELETE /api/projects/:id/assignments` با اعتبارسنجی **مجموع = ۱۰۰** (V-1, V-2)
- صفحات: `/admin/projects` (جدول با ستون «پرونده پروژه»)، `/admin/projects/:id` (هدر + اسکلت تب‌ها)
- ProgressBar پرداخت در برابر کل
- فرم ایجاد/ویرایش/حذف پروژه (مدیر)

---

## Phase 3 — پرداخت‌های کارفرما و اقساط
- ماژول `payments` (EmployerPayment CRUD + Zod)
- ماژول `installments`:
  - ایجاد تک و **تولید گروهی** (مبلغ ثابت × N ماه)
  - اعتبارسنجی V-3 با پیام «این مبلغ بیشتر از بدهی کارفرما است. باید از مبلغ یک قسط یا چک کم کنید.»
  - ثبت پرداخت_partial → محاسبه remaining → انتقال وضعیت به PAID → خروج از لیست فعال
  - ویرایش سررسید حتی پس از پرداخت جزئی (V-9)، حذف soft-delete
- تب اقساط در پرونده پروژه + ProgressBar

---

## Phase 4 — پرداخت کارمند + صفحه کارمند + مانده‌ها
- ماژول `employee-payments` با اعتبارسنجی V-5
- `/admin/employees` (لیست)، `/admin/employees/:id` (جزئیات: تجزیه پرداخت‌ها به تفکیک پروژه)
- `/admin/balances` — جدول مانده همه کارمندان

---

## Phase 5 — پنل کارمند + اعلان‌ها
- `/me` فقط‌خواندنی: پروژه‌های من + سهمم، تاریخچه پرداخت‌های کارفرما/اقساط، پرداخت‌های من، اعلان‌های من
- ماژول `notifications` — ساخت خودکار هنگام EmployerPayment (BR-6)، علامت‌گذاری خوانده‌شد

---

## Phase 6 — داشبورد، Polish و QA
- کارت‌های خلاصه داشبورد: تعداد پروژه‌ها، مانده بدهی کارفرما، پرداخت این ماه، کارمندان برتر بر اساس مانده
- تاریخچه فعالیت اخیر
- پاس کامل واکنش‌گرایی (موبایل‌اول)، دارک‌مود
- بازبینی نهایی در برابر لایه دانش (BR-1..7, V-1..10)

---

## وابستگی‌ها
```
Phase 0 ─> Phase 1 ─> Phase 2 ─> Phase 3 ─> Phase 4 ─> Phase 5 ─> Phase 6
```
هر فاز بدون وجود فاز قبلی قابل اجرا نیست (به‌جز ۰/۱ که ترتیبی هستند).

## خط مشی تأیید
پایان هر فاز: توقف، خلاصه‌سازی آنچه ساخته شد، لیست انحرافات، و انتظار تأیید کاربر.
