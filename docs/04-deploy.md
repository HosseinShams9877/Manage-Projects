# docs/04-deploy.md

# راهنمای دیپلوی روی Vercel

این سند مراحل کامل انتقال سامانه از محیط محلی (SQLite) به تولید
(PostgreSQL روی Vercel) را پوشش می‌دهد.

## پیش‌فرضها

- مخزن Git محلی آمادهٔ push (commit شده)
- حساب Vercel و دسترسی به مخزن (GitHub/GitLab/Bitbucket)
- یک پایگاه‌دادهٔ PostgreSQL (Vercel Postgres، Supabase، Neon یا هر ارائه‌دهنده)

---

## گام ۱ — ساخت PostgreSQL

۱. در Vercel: **Storage → Create → Postgres** (یا از ارائه‌دهندهٔ دلخواه).
۲. یک دیتابیس با نام دلخواه بسازید.
۳. رشتهٔ ارتباطی را کپی کنید (شیوهٔ `?pgbouncer=true&connection_limit=1` برای
   Connection Pooling در Vercel Postgres توصیه می‌شود).

> نیازی به_SCHEMA_CACHE_FLUSH نیست؛ اسکیمای عمومی `public` کافی است.

---

## گام ۲ — متغیرهای محیطی در Vercel

در **Settings → Environment Variables** اضافه کنید:

| نام | مقدار | محیط‌ها |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?schema=public` | Production, Preview |
| `JWT_SECRET` | یک رشتهٔ تصادفی ≥ ۳۲ کاراکتر (`openssl rand -base64 32`) | Production, Preview |
| `NEXT_PUBLIC_APP_NAME` | `سامانه مدیریت پروژه` | اختیاری |

> اگر نام نمایشی اپلیکیشن را می‌خواهید عوض کنید، یک متغیر `NEXT_PUBLIC_APP_NAME` هم اضافه کنید.

---

## گام ۳ — سوییچ provider در Prisma

در `prisma/schema.prisma`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "postgresql"
   url      = env("DATABASE_URL")
 }
```

سپس (روی سیستم محلی، با `DATABASE_URL` جدید در `.env`) مهاجرت جدید بسازید:

```bash
npx prisma migrate dev --name postgres-init
git add prisma/schema.prisma prisma/migrations
git commit -m "chore: switch prisma provider to postgresql"
git push
```

> پوشهٔ `prisma/migrations` حتماً باید commit شود؛ Vercel از همین پوشه
> برای `prisma generate` و `migrate deploy` استفاده می‌کند.

---

## گام ۴ — دستور build

در `package.json` دستور build به‌صورت زیر تنظیم شده است:

```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

بنابراین **Build Command در Vercel را روی `npm run build` بگذارید** (پیش‌فرض) —
`prisma generate` قبل از کامپایل Next اجرا می‌شود و کلاینت Prisma موجود می‌شود.

سایر تنظیمات Vercel:

| تنظیم | مقدار |
| --- | --- |
| Framework Preset | Next.js (خودکار) |
| Build Command | `npm run build` |
| Output Directory | `.next` (خودکار) |
| Node.js Version | ۲۰.x (یا بالاتر) |

---

## گام ۵ — دیپلوی اول

۱. در Vercel: **Add New → Project** و مخزن را انتخاب کنید.
۲. متغیرهای محیطی گام ۲ را تأیید کنید.
۳. **Deploy** را بزنید.
۴. چند لحظه صبر کنید — نخستین build باید سبز باشد:
   `✓ Compiled successfully` + `prisma generate` بدون خطا.

---

## گام ۶ — migrate و seed روی دیتابیس تولید (یک‌بار)

Vercel `prisma migrate deploy` را هنگام build اجرا نمی‌کند؛ این کار را
دقیقاً یک‌بار بعد از دیپلوی موفق انجام دهید:

```bash
# ۱. متغیرهای محیطی تولید را به فایل محلی بکشید
npm i -g vercel
vercel link
vercel env pull .env.production.local

# ۲. اجرای مهاجرت‌ها روی دیتابیس تولید
npx prisma migrate deploy

# ۳. اجرای سید (فقط یک‌بار، برای دمو/راه‌اندازی اولیه)
npx tsx prisma/seed.ts
```

> **هشدار:** `npm run db:reset` به‌هیچ‌وجه روی دیتابیس تولید اجرا نشود
> (داده‌ها را پاک می‌کند).

> اگر خطای `Migration failed to apply` گرفتید، مطمئن شوید مهاجرت
> `postgres-init` (گام ۳) commit و push شده باشد.

---

## گام ۷ — بررسی پس از دیپلوی

چک‌لیست تأیید:

- [ ] آدرس تولید باز می‌شود و به `/login` هدایت می‌شود
- [ ] ورود با حساب دمو (`admin@example.com` / `12345678`) کار می‌کند
- [ ] داشبورد مدیر اعداد صحیح را نشان می‌دهد
- [ ] صفحات `/me` (به‌عنوان کارمند) باز می‌شوند
- [ ] ثبت پرداخت یا قسط، داده را در Postgres ذخیره می‌کند
- [ ] مبالغ به‌صورت تومان و با ارقام فارسی نمایش داده می‌شوند
- [ ] تاریخ‌ها جلالی هستند (`۱۴۰۵/۰۸/۱۹`، نه `2026-11-09`)
- [ ] بدون خطایlatڅ runtime در Vercel Logs

در صورت مشکل:
- **خطای `PrismaClientInitializationError`** → `DATABASE_URL` نادرست یا build
  بدون `prisma generate`.
- **خطای prepared-statement (`P2034`)** → `?pgbouncer=true` را به انتهای
  `DATABASE_URL` اضافه کنید.
- **خطای عدم‌تطابق تاریخچهٔ مهاجرت (Migration history mismatch)** → `prisma migrate status` بزنید و
  مطمئن شوید همهٔ مهاجرت‌ها push شده‌اند.

---

## یادداشت‌های فنی

- **حداکثر اتصال‌ها:** Vercel Serverless هر تابع یک اتصال باز می‌کند؛ با
  PgBouncer (حالت `?pgbouncer=true`) یا یک Pooler (Neon/Supabase)
  از کمبود اتصال جلوگیری کنید.
- **حداکثر اندازهٔ Payload:** BigInt مستقیماً در JSON سریالایز نمی‌شود؛ لایهٔ
  `api-response` آن را به string تبدیل می‌کند (مثلاً `"1500000000"`)— همین
  رفتار در تولید هم معتبر است.
- **فونت:** فونت وزیرمتن از CDN (jsDelivr) بارگذاری می‌شود؛ اگر CDN در دسترس
  نباشد، فونت با fallback نمایش داده می‌شود (نه یک خطا).
