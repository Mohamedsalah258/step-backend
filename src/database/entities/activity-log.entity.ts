import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * سجل موحّد لكل الأحداث — بيغذي شاشتين مختلفتين في الفرونت:
 * 1) RECENT_ACTIVITY في الداشبورد (activity/student/content/date/status)
 * 2) ACTIVITY_LOG في /students/activity-log (action/tone/details/target/datetime/admin)
 * الـ mapping من actionType للنصوص العربية + التون موجود في common/action-catalog.ts
 * عشان يتحدث في مكان واحد لما تتضاف أنواع أحداث جديدة (orders, courses...).
 */
@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  /** مفتاح إنجليزي ثابت — شوف ActionType في action-catalog.ts */
  @Column()
  actionType: string

  /** null لو الحدث من غير طالب معيّن (زي صيانة النظام) */
  @Column({ nullable: true })
  studentId: string | null

  /** اسم الطالب وقت الحدث (denormalized) عشان السجل يفضل صحيح لو الاسم اتغيّر بعدين */
  @Column({ nullable: true })
  studentNameSnapshot: string | null

  @Column({ nullable: true })
  courseNameSnapshot: string | null

  /** تفاصيل حرة إضافية زي "الإيصال غير واضح" أو "الجهاز iPhone 15 Pro" */
  @Column({ nullable: true })
  details: string | null

  @Column({ default: 'النظام' })
  adminName: string

  /** null لو الحدث من غير أدمن مسجّل دخول (زي "النظام (تلقائي)") */
  @Column({ nullable: true })
  adminId: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
