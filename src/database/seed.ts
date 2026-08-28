/* eslint-disable no-console */
import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as dotenv from 'dotenv'
import * as bcrypt from 'bcrypt'
import { Student, StudentStatus } from './entities/student.entity'
import { ResetLog } from './entities/reset-log.entity'
import { Subscription, SubscriptionStatus } from './entities/subscription.entity'
import { ActivityLog } from './entities/activity-log.entity'
import { Admin } from './entities/admin.entity'
import { ActionType } from '../common/action-catalog'

dotenv.config()

// حساب الأدمن الافتراضي — بيتعمل مرة واحدة بس لو مفيش أدمن أصلاً.
// **لازم يتغيّر الباسورد بعد أول تسجيل دخول على أي بيئة حقيقية.**
const DEFAULT_ADMIN = {
  email: 'admin@step-edu.com',
  password: 'Step@2026',
  name: 'د. الحسن',
}

/**
 * Seed حقيقي في PostgreSQL.
 * أول 8 طلاب هنا هما **نفس** الـ 8 طلاب الموجودين حاليًا في mock الفرونت
 * (src/data/students.ts) بنفس الاسم/الإيميل/الهاتف/الجهاز — عشان أول ما
 * الفرونت يتحول للـ API الحقيقي، الشاشة تتفتح بنفس المحتوى بالظبط اللي
 * الفريق شايفه دلوقتي، وبعدين يزيد أي بيانات حقيقية فوقه عادي.
 * باقي الطلاب (18 كمان) بيانات صناعية إضافية عشان الصفحات (pagination/بحث/فلتر)
 * تتفحص على عدد واقعي مش 8 صفوف بس.
 */

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Student, ResetLog, Subscription, ActivityLog, Admin],
  synchronize: true,
})

const COURSES = [
  { course: 'أساسيات التشريح — الترم الأول', college: 'كلية الطب', price: 350 },
  { course: 'علم وظائف الأعضاء (Physiology)', college: 'كلية الطب', price: 400 },
  { course: 'الكيمياء الحيوية الطبية', college: 'كلية الصيدلة', price: 350 },
  { course: 'علم الأدوية الإكلينيكي', college: 'كلية الطب', price: 380 },
  { course: 'الفسيولوجي', college: 'كلية الطب', price: 320 },
  { course: 'الهستولوجي', college: 'كلية طب الأسنان', price: 300 },
]

const NAMED_STUDENTS: Array<{
  name: string
  email: string
  phone: string
  device: string
  deviceId: string
  status: StudentStatus
}> = [
  { name: 'أحمد محمود علي', email: 'ahmed.mah@gmail.com', phone: '01099238120', device: 'iPhone 15 Pro', deviceId: 'A1B2C3D4E5F6G7', status: StudentStatus.ACTIVE },
  { name: 'مريم عبد الرحمن', email: 'mariam.abdo@yahoo.com', phone: '01238491023', device: 'Samsung S23', deviceId: 'bf3961a0e9c8', status: StudentStatus.ACTIVE },
  { name: 'مصطفى أمين رجب', email: 'mostafa.amin@gmail.com', phone: '01023456789', device: 'Galaxy A54', deviceId: 'bf3961a0e9c84b32', status: StudentStatus.ACTIVE },
  { name: 'سارة عبد الله الشريف', email: 'sara.shereef@gmail.com', phone: '01582910391', device: 'iPad Air 5', deviceId: 'cc27a910f83b', status: StudentStatus.BANNED },
  { name: 'يوسف عمر الدسوقي', email: 'youssef.omar@outlook.com', phone: '01129381029', device: 'Xiaomi Redmi 12', deviceId: 'd812af0091ee', status: StudentStatus.ACTIVE },
  { name: 'منى حسين السعيد', email: 'mona.hassan@gmail.com', phone: '01099283011', device: 'Realme 11 Pro', deviceId: 'e920bc1183aa', status: StudentStatus.ACTIVE },
  { name: 'خالد عبد الله الرفاعي', email: 'khaled.ref@gmail.com', phone: '01283019283', device: 'iPhone 13', deviceId: 'f731dc2294bb', status: StudentStatus.ACTIVE },
  { name: 'هدى محمد فؤاد', email: 'hoda.fouad@gmail.com', phone: '01093019203', device: 'Samsung Tab S8', deviceId: 'a012ed3305cc', status: StudentStatus.ACTIVE },
]

const EXTRA_FIRST = ['عمر', 'ندى', 'كريم', 'ياسمين', 'محمد', 'آية', 'حسام', 'رنا', 'طارق', 'دينا', 'أمير', 'شهد', 'باسم', 'ملك', 'وائل', 'جنى', 'سامح', 'لينا']
const EXTRA_LAST = ['إبراهيم', 'السيد', 'عبد الحميد', 'الدمرداش', 'حماد', 'زكريا', 'النجار', 'عثمان']
const DEVICES = ['iPhone 14', 'iPhone 12', 'Samsung A34', 'Oppo Reno 8', 'Vivo Y36', 'Huawei P50']

async function main() {
  await dataSource.initialize()
  console.log('DB connected — seeding...')

  const studentRepo = dataSource.getRepository(Student)
  const subRepo = dataSource.getRepository(Subscription)
  const resetRepo = dataSource.getRepository(ResetLog)
  const activityRepo = dataSource.getRepository(ActivityLog)
  const adminRepo = dataSource.getRepository(Admin)

  // سييد الأدمن الافتراضي منفصل عن سييد الطلاب — عشان لو حد عمل truncate
  // على جداول الطلاب بس، حساب الدخول يفضل موجود ومتقفلش برّه من غير auth.
  const existingAdmin = await adminRepo.findOne({ where: { email: DEFAULT_ADMIN.email } })
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10)
    await adminRepo.save(
      adminRepo.create({
        email: DEFAULT_ADMIN.email,
        passwordHash,
        name: DEFAULT_ADMIN.name,
      }),
    )
    console.log(`تم إنشاء حساب الأدمن الافتراضي: ${DEFAULT_ADMIN.email} / ${DEFAULT_ADMIN.password}`)
  } else {
    console.log('حساب الأدمن الافتراضي موجود بالفعل — سيب زي ما هو.')
  }

  // نضيف الـ seed مرة واحدة بس — لو فيه طلاب خلاص متسجلين منسحبش
  const existing = await studentRepo.count()
  if (existing > 0) {
    console.log(`فيه ${existing} طالب متسجل بالفعل — سيب الداتا زي ما هي.`)
    await dataSource.destroy()
    return
  }

  const allStudents: Student[] = []

  for (const s of NAMED_STUDENTS) {
    const student = await studentRepo.save(
      studentRepo.create({
        name: s.name,
        email: s.email,
        phone: s.phone,
        status: s.status,
        deviceModel: s.device,
        deviceIdentifier: s.deviceId,
        resetsUsed: s.name === 'أحمد محمود علي' || s.name === 'مصطفى أمين رجب' ? 2 : 0,
        lastResetAt:
          s.name === 'أحمد محمود علي' || s.name === 'مصطفى أمين رجب'
            ? new Date('2026-04-20')
            : null,
      }),
    )
    allStudents.push(student)
  }

  // 18 طالب إضافي — بيانات صناعية لتغطية pagination/بحث/فلتر على عدد واقعي
  for (let i = 0; i < 18; i++) {
    const first = EXTRA_FIRST[i % EXTRA_FIRST.length]
    const last = EXTRA_LAST[i % EXTRA_LAST.length]
    const name = `${first} ${last}`
    const email = `${first}.${last}.${i}@example.com`.replace(/\s/g, '')
    const student = await studentRepo.save(
      studentRepo.create({
        name,
        email,
        phone: `010${(10000000 + i * 137).toString().padStart(8, '0')}`,
        status: i % 9 === 0 ? StudentStatus.BANNED : StudentStatus.ACTIVE,
        deviceModel: DEVICES[i % DEVICES.length],
        deviceIdentifier: `dev-${i}-${Math.abs(i * 7919).toString(16)}`,
        resetsUsed: i % 4,
        lastResetAt: i % 4 > 0 ? new Date('2026-05-01') : null,
      }),
    )
    allStudents.push(student)
  }

  // اشتراكات: أحمد (3 مطابقة للموك) + مصطفى (2 مطابقة للدروار) + باقي الطلاب عشوائي محكوم
  const ahmed = allStudents.find((s) => s.email === 'ahmed.mah@gmail.com')!
  await subRepo.save([
    subRepo.create({ studentId: ahmed.id, courseName: COURSES[0].course, collegeName: COURSES[0].college, price: 350, status: SubscriptionStatus.ACTIVE, subscribedAt: new Date('2026-02-10') }),
    subRepo.create({ studentId: ahmed.id, courseName: COURSES[1].course, collegeName: COURSES[1].college, price: 400, status: SubscriptionStatus.ACTIVE, subscribedAt: new Date('2026-03-05') }),
    subRepo.create({ studentId: ahmed.id, courseName: COURSES[2].course, collegeName: COURSES[2].college, price: 350, status: SubscriptionStatus.CANCELLED, subscribedAt: new Date('2026-04-12') }),
  ])
  await resetRepo.save([
    resetRepo.create({ studentId: ahmed.id, deviceModel: 'iPhone 15 Pro', byAdmin: 'د. الحسن', createdAt: new Date('2026-04-20') }),
    resetRepo.create({ studentId: ahmed.id, deviceModel: 'iPhone 13', byAdmin: 'النظام (تلقائي)', createdAt: new Date('2026-02-15') }),
  ])

  const mostafa = allStudents.find((s) => s.email === 'mostafa.amin@gmail.com')!
  await subRepo.save([
    subRepo.create({ studentId: mostafa.id, courseName: COURSES[0].course, collegeName: COURSES[0].college, price: 350, status: SubscriptionStatus.ACTIVE, subscribedAt: new Date('2025-02-15') }),
    subRepo.create({ studentId: mostafa.id, courseName: COURSES[1].course, collegeName: COURSES[1].college, price: 400, status: SubscriptionStatus.ACTIVE, subscribedAt: new Date('2025-03-01') }),
  ])

  // باقي الطلاب: 1-2 اشتراك عشوائي محكوم (مش Math.random حرفيًا عشان يفضل ثابت بين كل تشغيلة)
  let seedCursor = 0
  for (const student of allStudents) {
    if (student.id === ahmed.id || student.id === mostafa.id) continue
    const count = (seedCursor % 2) + 1
    for (let k = 0; k < count; k++) {
      const course = COURSES[(seedCursor + k) % COURSES.length]
      const monthsAgo = ((seedCursor + k) % 6) + 1
      const subscribedAt = new Date()
      subscribedAt.setMonth(subscribedAt.getMonth() - monthsAgo)
      await subRepo.save(
        subRepo.create({
          studentId: student.id,
          courseName: course.course,
          collegeName: course.college,
          price: course.price,
          status: SubscriptionStatus.ACTIVE,
          subscribedAt,
        }),
      )
    }
    seedCursor++
  }

  // سجل عمليات واقعي (بديل موحّد لـ RECENT_ACTIVITY و ACTIVITY_LOG المنفصلين في الموك القديم)
  const banned = allStudents.find((s) => s.status === StudentStatus.BANNED)
  const activityEntries: Array<{
    actionType: ActionType
    studentId?: string
    studentNameSnapshot?: string
    courseNameSnapshot?: string
    details?: string
    adminName: string
    createdAt: Date
  }> = [
    { actionType: ActionType.DEVICE_RESET, studentId: ahmed.id, studentNameSnapshot: ahmed.name, details: 'الجهاز iPhone 15 Pro', adminName: 'د. الحسن', createdAt: new Date('2026-05-24T16:32:00') },
    { actionType: ActionType.CANCEL_SUBSCRIPTION, studentId: ahmed.id, studentNameSnapshot: ahmed.name, courseNameSnapshot: COURSES[2].course, adminName: 'د. الحسن', createdAt: new Date('2026-05-24T15:15:00') },
    { actionType: ActionType.DEVICE_RESET, studentId: mostafa.id, studentNameSnapshot: mostafa.name, details: 'الجهاز Samsung Galaxy A54', adminName: 'د. الحسن', createdAt: new Date('2026-05-24T14:30:00') },
    ...(banned
      ? [{ actionType: ActionType.BAN_STUDENT, studentId: banned.id, studentNameSnapshot: banned.name, details: `الجهاز ${banned.deviceModel}`, adminName: 'د. الحسن', createdAt: new Date('2026-05-24T13:45:00') }]
      : []),
    { actionType: ActionType.UNBAN_STUDENT, studentId: allStudents[5].id, studentNameSnapshot: allStudents[5].name, adminName: 'د. الحسن', createdAt: new Date('2026-05-23T17:20:00') },
    { actionType: ActionType.OPEN_COURSE, studentId: allStudents[6].id, studentNameSnapshot: allStudents[6].name, courseNameSnapshot: COURSES[3].course, adminName: 'د. الحسن', createdAt: new Date('2026-05-23T16:10:00') },
    { actionType: ActionType.CANCEL_SUBSCRIPTION, studentId: allStudents[7].id, studentNameSnapshot: allStudents[7].name, courseNameSnapshot: COURSES[4].course, adminName: 'د. الحسن', createdAt: new Date('2026-05-23T14:50:00') },
    { actionType: ActionType.MAINTENANCE_ON, details: 'تحديث قواعد البيانات (3 ساعات)', adminName: 'النظام', createdAt: new Date('2026-05-22T23:00:00') },
    { actionType: ActionType.MAINTENANCE_OFF, details: 'المدة الفعلية: 2.5 ساعة', adminName: 'النظام', createdAt: new Date('2026-05-23T01:30:00') },
    { actionType: ActionType.TERM_RESET, details: 'الترم الأول — الطب البشري', adminName: 'النظام', createdAt: new Date('2026-05-20T09:00:00') },
  ]
  await activityRepo.save(activityEntries.map((e) => activityRepo.create(e)))

  console.log(`تم Seed: ${allStudents.length} طالب، وسجل عمليات (${activityEntries.length} حدث).`)
  await dataSource.destroy()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
