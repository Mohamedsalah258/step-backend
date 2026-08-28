import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Student } from './student.entity'
import { Course } from './course.entity'

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

/** يقابل STUDENT_SUBSCRIPTIONS / SubscriptionRow */
@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Student, (s) => s.subscriptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @Column()
  courseName: string

  /**
   * FK حقيقي — nullable عشان الاشتراكات القديمة (فتح يدوي بكورس نصي حر عبر
   * openCourse، أو بيانات seed) تفضل شغالة بلا FK. أي اشتراك بيتعمل من موافقة
   * طلب شراء حقيقي (Orders، Phase 3) بياخد الـ FK ده — شوف courses.service.ts
   * list() في مطابقة عدد الطلاب اللي بتستخدم الاتنين مع بعض للتوافق.
   */
  @ManyToOne(() => Course, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: Course | null

  @Column({ nullable: true })
  courseId: string | null

  @Column()
  collegeName: string

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus

  /** جنيه مصري — رقم صحيح، مفيش كسور (شوف STEP_Admin_Backend spec §5.أ) */
  @Column({ type: 'int' })
  price: number

  @CreateDateColumn({ type: 'timestamptz' })
  subscribedAt: Date
}
