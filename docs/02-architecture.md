# ۰۲ — معماری و نقشه پوشه‌ها

پروژه Next.js 15 App Router با معماری ماژولار. کد در `src/` و لایه مشترک در `src/core/`.

---

## ساختار پوشه‌ها

```
src/
  core/                      # لایه مشترک هسته
    components/              # Button, Card, Modal, Table, ProgressBar, Badge,
                             # Input, JalaliDatePicker, Toast, ConfirmDialog, ...
    lib/
      prisma.ts              # singleton PrismaClient
      query-client.ts        # ساخت QueryClient
      format.ts              # ارقام فارسی، تاریخ جلالی، واحد پول (تومان)
      auth.ts                # JWT کوکی (jose) + bcrypt + getSession()
      api-response.ts        # ok()/err() → { ok, data | error }
      api-client.ts          # fetcher استاندارد برای React Query
      validations.ts         # آنومانی‌های مشترک Zod
    hooks/                   # useSession, useToast, ...
    types/                   # ApiResult, SessionUser, ...
    constants/               # نقش‌ها، وضعیت اقساط، برچسب‌های فارسی
  modules/                   # ماژول‌های دامنه (هرکدام مستقل)
    auth/
    dashboard/
    projects/
    employees/
    payments/
    installments/
    employee-payments/
    notifications/
      components/            # کامپوننت‌های مختص ماژول
      lib/                   # service layer (منطق کسب‌وکار + Prisma)
      hooks/                 # useQuery/useMutation مختص ماژول
      types/
      api/                   # route handlers — هر سرویس را صدا می‌زند
      schema/                # اسکیماهای Zod مختص ماژول
  app/
    (auth)/login/            # صفحه ورود
    (admin)/admin/           # مسیرهای مدیر
    (employee)/me/           # مسیرهای کارمند
    api/                     # route handlerهای نازک — فقط delegate به modules/*/lib
  middleware.ts              # محافظت نقش‌پایه /admin و /me
prisma/
  schema.prisma
  seed.ts
docs/                        # لایه دانش، نقشه راه، معماری
```

---

## قراردادهای نام‌گذاری

- **فایل کامپوننت**: `PascalCase.tsx` (مثال: `ProjectForm.tsx`).
- **فایل کتابخانه/سرویس**: `kebab-case.ts` (مثال: `project-service.ts`).
- **هوک**: `use<Feature>.ts` (مثال: `useProjects.ts`).
- **API route**: `app/api/<resource>/route.ts` برای کالکشن، `app/api/<resource>/[id]/route.ts` برای آیتم.
- **سرویس ماژول**: `modules/<m>/lib/<m>-service.ts` — همه منطق کسب‌وکار آنجا؛ route handler فقط Zod parse + auth + صدازدن سرویس.
- **آرایه‌ها و لیست‌ها**: نام جمع. ثابت‌ها `UPPER_SNAKE_CASE`.

---

## نقشه API → سرویس ماژول

| مسیر API | ماژول | سرویس |
|---|---|---|
| `POST /api/auth/login` | auth | `auth-service.login` |
| `POST /api/auth/logout` | auth | `auth-service.logout` |
| `GET /api/me` | auth | `auth-service.me` |
| `GET,POST /api/projects` | projects | `project-service.list/create` |
| `GET,PATCH,DELETE /api/projects/[id]` | projects | `project-service.get/update/delete` |
| `GET,POST /api/projects/[id]/assignments` | projects | `project-service.assignments` |
| `DELETE /api/assignments/[id]` | projects | `project-service.removeAssignment` |
| `GET,POST /api/employer-payments` | payments | `payment-service.list/create` |
| `PATCH,DELETE /api/employer-payments/[id]` | payments | `payment-service.update/delete` |
| `GET,POST /api/installments` | installments | `installment-service.list/create` |
| `GET,PATCH,DELETE /api/installments/[id]` | installments | `installment-service.get/update/delete` |
| `POST /api/installments/[id]/pay` | installments | `installment-service.recordPayment` |
| `GET,POST /api/employee-payments` | employee-payments | `employee-payment-service.list/create` |
| `PATCH,DELETE /api/employee-payments/[id]` | employee-payments | `employee-payment-service.update/delete` |
| `GET /api/employees` | employees | `employee-service.list` |
| `GET /api/employees/[id]` | employees | `employee-service.get` |
| `GET /api/balances` | employees | `employee-service.balances` |
| `GET,PATCH /api/notifications` | notifications | `notification-service.list/markRead` |
| `GET /api/dashboard/summary` | dashboard | `dashboard-service.summary` |

---

## لایه‌بندی جریان داده

```
UI (module components)
  → module hooks (useQuery / useMutation)
    → api-client (fetch با پاکت { ok, data | error })
      → app/api/**/route.ts (auth + Zod)
        → modules/*/lib/*-service.ts (منطق کسب‌وکار + Prisma)
          → Prisma → SQLite
```

- UI هرگز مستقیماً Prisma را صدا نمی‌زند.
- route handlerها نازک‌اند: فقط احراز هویت، اعتبارسنجی Zod و delegate.
- همه منطق کسب‌وکار (BR-1..7, V-1..10) در سرویس‌ها متمرکز است.

---

## پاکت پاسخ API

```ts
// موفق
{ "ok": true, "data": T }
// خطا
{ "ok": false, "error": { "message": "پیام فارسی", "code": "INSTALLMENT_EXCEEDS_DEBT" } }
```

---

## توکن‌های طراحی (Design Tokens)

تمام رنگ‌ها، شعاع‌ها و سایه‌ها به‌عنوان CSS variables در `src/app/globals.css` زیر `:root` (روشن) و `.dark` (تاریک) تعریف می‌شوند. کامپوننت‌ها هرگز رنگ ثابت هاردکد نمی‌کنند — فقط از کلاس‌های مبتنی بر توکن (مثلاً `bg-background`، `text-foreground`) استفاده می‌کنند. تغییر یک متغیر در `globals.css` کل اپلیکیشن را تم‌ theme می‌کند.
