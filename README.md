# STEP Backend — API الحقيقي بتاع لوحة تحكم STEP

باك اند **NestJS + TypeORM + PostgreSQL** بيغذي داش بورد STEP (`D:\Step`)
وتطبيق الطالب (Flutter). الدومينات الحالية: الطلاب والأجهزة، auth الطالب
(تسجيل بتأكيد إيميل OTP + قفل جهاز واحد)، auth الأدمن، الهيكل الأكاديمي،
الكورسات والمحتوى، طلبات الشراء، طرق الدفع، التقارير، البنرات، الصفحات
والسياسات، وضع الصيانة، قفل تعديل البروفايل الأكاديمي، ولوحة التحكم +
سجل العمليات المركزي.

### آخر تحديثات (اقرأها الأول قبل ما تسأل "إيه الموجود؟")

- **تسجيل الطالب بقى خطوتين** — `POST /student-auth/register` بيبعت OTP
  بالإيميل ويرجّع `{ok:true}` بس (من غير توكن)، والحساب الحقيقي بيتعمله
  create بعد `POST /student-auth/verify-registration-otp` بس. شوف
  `PendingStudentRegistration` entity + `StudentAuthService.register/
  verifyRegistrationOtp`.
- **قفل الجهاز بقى بيتفعّل وقت التسجيل مش بس تسجيل الدخول** — مينفعش
  حساب جديد يتسجّل بجهاز مرتبط بحساب طالب تاني بالفعل (`409
  DEVICE_ALREADY_REGISTERED`). قرار متعمّد: **مفيش self-service إعادة ربط
  بكود** — عمدًا، عشان ميبقاش ثغرة لمشاركة حساب واحد بين طلاب. الحل
  الوحيد لتضارب الجهاز لسه "تواصل مع الدعم" + الأدمن يعمل device-reset
  يدوي من الداش بورد.
- **وضع الصيانة بقى بيتفعّل فعليًا** — قبل كده كان شكلي بس. دلوقتي أي
  request من الطالب (`/student-auth/*`) وقت الصيانة بيترفض بـ `503
  MAINTENANCE_MODE`. الأدمن مش متأثر خالص (شوف `MaintenanceGuard`).
  تطبيق الفلاتر لسه محتاج (بلاغ اتبعتله) يمسك الكود ده ويعرض شاشة صيانة.
- **قفل تعديل البيانات الأكاديمية** (`src/profile-lock`) — الأدمن يقدر
  يقفل تعديل المستوى/الترم لكل الطلاب دفعة واحدة (`/profile-lock/toggle`)،
  أو يفتح استثناء لطالب واحد بس (`/students/:id/profile-unlock`).

## ليه TypeORM مش Prisma

اتفقنا الأول على Prisma، لكن بيئة التطوير السحابية اللي اتبنى فيها المشروع
أول مرة كانت بتمنع تحميل الـ engine binaries بتاعت Prisma (مشكلة شبكة في
بيئة العمل، مش في Prisma نفسه). TypeORM بيدّي نفس الحماية (type-safe
entities/repositories) من غير ما يحتاج يحمّل أي binary — بيشتغل بـ `pg`
(driver JS عادي) بس. لو حابب ترجع لـ Prisma على جهازك (فيه إنترنت كامل)
ده ممكن كـ تعديل لاحق، بس مش لازم.

## التشغيل

```bash
npm install

# 1) شغّل PostgreSQL محليًا وأنشئ قاعدة بيانات
createdb step_db   # أو أي طريقة تانية عندك

# 2) اعمل نسخة من .env.example وعدّل DATABASE_URL لو مختلف عندك
cp .env.example .env

# 3) اعمل seed (بيبني الجداول تلقائي أول مرة عن طريق synchronize:true)
npx ts-node -r tsconfig-paths/register src/database/seed.ts

# 4) شغّل السيرفر
npm run start:dev
```

- API: `http://localhost:3000`
- توثيق Swagger تفاعلي: `http://localhost:3000/api-docs`
- Swagger JSON (لتوليد types/client في الفرونت والموبايل): `http://localhost:3000/api-docs-json`

## القرارات المعمارية

### قرار #1 — `synchronize: true` بدل migrations دلوقتي

مريح جدًا في مرحلة النموذج الأولي: الجداول بتتبني تلقائي من الـ entities.
**قبل أي نشر production حقيقي**، لازم يتقفل ده ويتستبدل بـ TypeORM migrations
حقيقية (`typeorm migration:generate`) عشان تتحكم في تعديلات السكيما بأمان.

### قرار #2 — النصوص العربية الجاهزة للعرض تفضل في الفرونت

الـ API بيرجّع بس القيم الديناميكية الخام (status كـ enum متحول لنص عربي
عند الإخراج، أرقام خام للأسعار، تواريخ ISO). أي نص UI ثابت (عناوين
الأعمدة، labels الفورمات، الـ placeholders) مايتحطش هنا — هو أصلًا موجود
في `data/*.ts` بالفرونت وبيفضل زي ما هو.

استثناء واحد: حالات (`status`) الطالب/الاشتراك بترجع كنص عربي جاهز
(`نشط`/`محظور`/`ملغي`...) عشان بالظبط يطابق مفاتيح `STATUS_TONE` في
`components/ui/Badge.tsx` بالفرونت من غير أي تعديل هناك. الخريطة دي
لو احتجت تضيف حالة جديدة، حدّثها في `src/common/action-catalog.ts` هنا
**و** `STATUS_TONE` هناك مع بعض.

### قرار #3 — `ActionType` مركزي لكل الأحداث

كل حدث (ban/unban/device-reset/cancel-sub/open-course...) بيتسجل في جدول
`activity_logs` واحد، وبيغذي شاشتين مختلفتين في الفرونت (RECENT_ACTIVITY
بالداشبورد + ACTIVITY_LOG بصفحة سجل العمليات) من نفس المصدر — بعكس الموك
القديم اللي كان فيهم بيانات مختلفة/متضاربة في كل ملف. النص العربي والتون
لكل نوع حدث موجودين في `src/common/action-catalog.ts` بس — أي دومين جديد
(orders, courses...) يضيف مفاتيحه هناك.

### قرار #4 — حد الريست المبسّط (3 كل 30 يوم من آخر ريست)

مش rolling window شهري حقيقي (زي "يترجع صفر أول كل شهر ميلادي") — إنما
عداد بسيط يوصل لحد أقصى 3 من غير ريست تلقائي. لو محتاج المنطق الشهري
الحقيقي، ده تعديل صغير في `StudentsService.deviceReset`.

## ديون تقنية معروفة

1. **مفيش أي اختبارات خالص (0% coverage)** — بنية Jest جاهزة بالكامل
   (`test`, `test:cov`, `test:e2e`) بس مفيش أي `*.spec.ts` مكتوب لحد
   دلوقتي. أعلى أولوية لو بندوّر على "خطوة جاية" سريعة وعالية القيمة.
2. **تخزين الملفات (فيديوهات/إيصالات) على الـ disk المحلي بس** — مفيش
   S3/تخزين سحابي. الرفع والتحميل شغالين فعليًا، بس متعلّمين في الكود
   كـ "مؤقت" (`UploadedFile` entity + `uploads.controller.ts`) — مش
   هيصمدوا مع نشر multi-server حقيقي أو أي إعادة deploy بتمسح الـ disk.
3. **`pendingDeviceResets` دايمًا 0** — الريست في النسخة دي إجراء فوري
   (زرار بيتنفذ على طول)، مفيش مفهوم "طلب ريست معلّق للموافقة" لسه.
4. **الـ `index` في جدول الطلاب** رقم عرض حسب ترتيب الصفحة الحالية بس، مش
   عمود مخزّن — يتغيّر لو غيّرت الترتيب أو الفلتر.
5. **CSV export** بيرجّع كل الصفوف المفلترة دفعة واحدة (من غير حد أقصى) —
   لو عدد السجلات كبر جدًا، محتاج streaming بدل تجميعها في الميموري.
6. **الأدمن كله بنفس الصلاحيات** — مفيش أدوار (roles) مختلفة دلوقتي، أي
   حساب أدمن مسجل بيقدر يعمل أي حاجة. لو محتاج تفرقة (super-admin مثلًا)،
   ده تعديل لاحق على `Admin` entity + الـ guard.
7. **مفيش refresh token ولا logout حقيقي من السيرفر** — التوكن صالح لحد
   ما ينتهي (`JWT_EXPIRES_IN`، افتراضي 7 أيام) أو المستخدم يمسحه من
   الفرونت. لو محتاج إلغاء فوري لتوكن معين قبل ما ينتهي، محتاج blacklist
   أو تقصير المدة.
8. **`synchronize: true` لسه شغالة** (شوف قرار #1 فوق) — لازم يتقفل
   ويتستبدل بـ migrations حقيقية قبل أي نشر production.

## Auth — إزاي شغالة

كل الـ endpoints في المشروع محمية بـ JWT افتراضيًا (عبر `JwtAuthGuard`
مسجّل globally في `AppModule` بـ `APP_GUARD`)، ما عدا اللي متعلّمة صراحةً
بـ `@Public()` (حاليًا: `POST /auth/login` و`POST /auth/register` بس).

- **`POST /auth/register`** — بيتطلب `{email, password, name, inviteCode}`.
  الـ `inviteCode` لازم يطابق `ADMIN_INVITE_CODE` في `.env`، وده اللي بيمنع
  أي حد من برّه يعمل حساب أدمن لنفسه من غير إذن. بيرجّع `{accessToken, admin}`.
- **`POST /auth/login`** — `{email, password}` → `{accessToken, admin}`.
- **`GET /auth/me`** — بيرجّع بيانات الأدمن الحالي من التوكن (endpoint محمي).
- التوكن بيتبعت في كل طلب لاحق كـ `Authorization: Bearer <token>`.

**حساب أدمن افتراضي** بيتعمل تلقائي أول مرة تشغّل فيها الـ seed (لو مفيش
أدمن أصلاً): `admin@step-edu.com` / `Step@2026` — **لازم يتغيّر الباسورد
ده بعد أول تسجيل دخول على أي بيئة حقيقية.**

المتغيرات المطلوبة في `.env`: `JWT_SECRET` (سر توقيع التوكن)،
`JWT_EXPIRES_IN` (افتراضي `7d`)، `ADMIN_INVITE_CODE` (كود الدعوة
للتسجيل). القيم الموجودة في `.env` دلوقتي عشوائية جاهزة للتطوير — غيّرها
على أي سيرفر إنتاج حقيقي.

## خريطة الـ endpoints

| Method | Path | الوظيفة |
|---|---|---|
| POST | `/auth/register` | تسجيل أدمن جديد `{email, password, name, inviteCode}` — **Public** |
| POST | `/auth/login` | تسجيل دخول `{email, password}` — **Public** |
| GET | `/auth/me` | بيانات الأدمن الحالي من التوكن |
| GET | `/students` | قائمة + بحث `q` + تاب `tab` + فلتر كورس `course` + صفحات |
| GET | `/students/:id` | تفاصيل كاملة (بروفايل + جهاز + سجل ريست + اشتراكات) |
| POST | `/students/:id/ban` | حظر |
| POST | `/students/:id/unban` | فك حظر |
| POST | `/students/:id/device-reset` | ريست جهاز (حد أقصى 3) |
| POST | `/students/:id/subscriptions/:subId/cancel` | إلغاء اشتراك |
| POST | `/students/:id/subscriptions/:subId/reactivate` | تنشيط اشتراك ملغي (بيرجّع نفس الصف لـ ACTIVE، مش صف جديد) |
| POST | `/students/:id/subscriptions/open` | فتح كورس يدوي `{courseName, collegeName?, price?}` |
| GET | `/dashboard/stats` | كروت الـ KPI في أعلى الداشبورد |
| GET | `/dashboard/orders-trend` | آخر 6 شهور (بروكسي من الاشتراكات) |
| GET | `/dashboard/subs-per-course` | أكتر 5 كورسات اشتراكًا |
| GET | `/dashboard/monthly-revenue` | الإيراد الشهري (آخر 6 شهور) |
| GET | `/dashboard/recent-activity` | آخر 5 أحداث |
| GET | `/activity-log` | سجل العمليات + بحث/فلتر/صفحات حقيقية |
| GET | `/activity-log/stats` | عدادات أسبوعي/اليوم/إجمالي |
| GET | `/activity-log/export.csv` | تصدير نفس النتائج المفلترة CSV |

كل الـ endpoints من `/students` لحد `/activity-log/export.csv` محمية —
محتاجة `Authorization: Bearer <token>` وإلا هترجع `401`.

## الخطوة الجاية

لما تحب تضيف دومين تاني (Orders مثلًا)، اتبع نفس النمط بالظبط: entity في
`src/database/entities/`، module/service/controller في مجلد باسم
الدومين، وأضف مفاتيح `ActionType` جديدة في `action-catalog.ts` لو فيه
أحداث جديدة. بعد ما تخلص، ارجع لملف `data/<domain>.ts` المقابل في ريبو
الداش بورد وبدّل الـ exports الديناميكية بنداءات لهذا الـ API — بالظبط
زي ما اتعمل في `students.ts` و`dashboard.ts`.
