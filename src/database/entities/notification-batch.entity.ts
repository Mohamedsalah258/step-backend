import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * سجل إرسال إشعار مخصّص من الأدمن (شاشة "الإشعارات" بالداشبورد) — صف واحد
 * لكل عملية إرسال، بيغذّي "سجل الإشعارات المرسلة سابقاً". منفصل عن
 * `Notification` (اللي هو صف لكل طالب مستلم) — ده ملخّص العملية نفسها.
 */
@Entity('notification_batches')
export class NotificationBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ type: 'text' })
  body: string

  /** حاليًا قيمة واحدة بس من الفرونت ("عام") — نص حر عشان نضيف أنواع لاحقًا من غير migration */
  @Column({ default: 'عام' })
  type: string

  @Column({ nullable: true })
  courseId: string | null

  @Column({ nullable: true })
  stageId: string | null

  @Column({ nullable: true })
  termId: string | null

  /** نص جاهز للعرض زي "كل الطلاب (1,247 طالب)" — denormalized وقت الإرسال */
  @Column()
  audienceLabel: string

  @Column({ type: 'int' })
  recipientCount: number

  /** إرسال متزامن فوري في MVP — قيمة واحدة بس حاليًا */
  @Column({ default: 'مرسل' })
  status: string

  @Column()
  sentByAdminName: string

  @Column({ nullable: true })
  sentByAdminId: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
