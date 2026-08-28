import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ResetLog } from './reset-log.entity'
import { Subscription } from './subscription.entity'
import { University } from './university.entity'
import { College } from './college.entity'
import { Specialization } from './specialization.entity'
import { Stage } from './stage.entity'
import { Term } from './term.entity'

export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
}

/**
 * كيان الطالب — يقابل الحقول الديناميكية في StudentRow / STUDENT_DETAIL /
 * STUDENT_DRAWER (src/data/students.ts في ريبو الداش بورد).
 * النصوص العربية الجاهزة للعرض (تسميات الأعمدة، عناوين الأقسام...) بتفضل في
 * الفرونت زي ما هي — هنا بس القيم الديناميكية الحقيقية.
 */
@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  email: string

  @Column()
  phone: string

  @Column({ type: 'enum', enum: StudentStatus, default: StudentStatus.ACTIVE })
  status: StudentStatus

  /**
   * null لحد ما الطالب يسجّل حساب حقيقي بنفسه (طلاب الـ seed/اللي بيضيفهم
   * الأدمن يدويًا مفيهمش باسورد لغاية ما يعملوا تسجيل حقيقي عبر تطبيق الطالب).
   */
  @Column({ nullable: true })
  passwordHash: string | null

  /** الهيكل الأكاديمي بتاع الطالب نفسه (مُلتقط وقت التسجيل) — مختلف عن
   * college/university أي كورس بيشترك فيه، ده "بيته الأكاديمي" الأساسي. */
  @ManyToOne(() => University, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'universityId' })
  university: University | null

  @Column({ nullable: true })
  universityId: string | null

  @ManyToOne(() => College, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'collegeId' })
  college: College | null

  @Column({ nullable: true })
  collegeId: string | null

  @ManyToOne(() => Specialization, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'specializationId' })
  specialization: Specialization | null

  @Column({ nullable: true })
  specializationId: string | null

  @ManyToOne(() => Stage, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'stageId' })
  stage: Stage | null

  @Column({ nullable: true })
  stageId: string | null

  @ManyToOne(() => Term, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'termId' })
  term: Term | null

  @Column({ nullable: true })
  termId: string | null

  /** استثناء يدوي بيفتحه الأدمن لطالب معيّن — بيتجاهل قفل تعديل البيانات
   * الأكاديمية العام (شوف ProfileLockService) لحد ما الأدمن يقفله تاني. */
  @Column({ default: false })
  profileEditUnlocked: boolean

  @Column({ nullable: true })
  deviceModel: string | null

  @Column({ nullable: true })
  deviceIdentifier: string | null

  /** توكن FCM الحالي لجهاز الطالب — نفس منطق الجهاز الواحد (deviceIdentifier)،
   * فتوكن واحد بس بيكفي. بيتصفّى تلقائيًا لو FCM رجّعه invalid وقت الإرسال. */
  @Column({ nullable: true })
  fcmToken: string | null

  /** حالة "نسيت كلمة المرور" — الكود متخزن مشفّر (bcrypt) زي الباسورد نفسه،
   * وليه صلاحية محدودة (١٠ دقايق) ومحاولات محدودة (شوف student-auth.service.ts). */
  @Column({ nullable: true })
  resetOtpHash: string | null

  @Column({ type: 'timestamptz', nullable: true })
  resetOtpExpiresAt: Date | null

  @Column({ default: 0 })
  resetOtpAttempts: number

  /** عدد مرات الريست المستخدمة — أقصى حد 3 (قرار مبسّط، شوف README) */
  @Column({ default: 0 })
  resetsUsed: number

  @Column({ type: 'timestamptz', nullable: true })
  lastResetAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  registeredAt: Date

  @OneToMany(() => Subscription, (s) => s.student)
  subscriptions: Subscription[]

  @OneToMany(() => ResetLog, (r) => r.student)
  resetLogs: ResetLog[]
}
