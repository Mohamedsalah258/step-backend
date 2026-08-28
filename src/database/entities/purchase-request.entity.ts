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
import { PaymentMethod } from './payment-method.entity'
import { PurchaseRequestStatus } from './purchase-request-status.enum'

/**
 * طلب شراء يدوي — الطالب بيرفع إيصال تحويل ويستنى مراجعة الأدمن. إنشاء
 * الطلب نفسه من نصيب تطبيق الطالب (خارج نطاق الخطة الحالية عمدًا)، فمفيش
 * POST هنا — الأدمن بس بيراجع/يوافق/يرفض الطلبات الموجودة.
 */
@Entity('purchase_requests')
export class PurchaseRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course

  @Column()
  courseId: string

  @ManyToOne(() => PaymentMethod, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'paymentMethodId' })
  paymentMethod: PaymentMethod | null

  @Column({ nullable: true })
  paymentMethodId: string | null

  /** جنيه مصري — integer */
  @Column({ type: 'int' })
  amount: number

  @Column({ unique: true })
  referenceNumber: string

  /** id بتاع UploadedFile — بدون FK رسمية، نفس نمط fileId في الكورسات */
  @Column({ nullable: true })
  receiptFileId: string | null

  @Column({ type: 'enum', enum: PurchaseRequestStatus, default: PurchaseRequestStatus.PENDING })
  status: PurchaseRequestStatus

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null

  @Column({ nullable: true })
  reviewedByAdminId: string | null

  @Column({ nullable: true })
  reviewedByAdminName: string | null

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
