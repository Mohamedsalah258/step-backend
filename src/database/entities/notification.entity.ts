import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { NotificationType } from './notification-type.enum'

/**
 * إشعار طالب واحد — كل حدث بيولّد صف مستقل لكل طالب مستهدف (زي ActivityLog،
 * denormalized بدل relations). `sourceKey` بيمثّل هوية الحدث نفسه (مش
 * الطالب) — مع الـ unique index تحت، بيمنع تكرار نفس الإشعار لنفس الطالب
 * لو نفس العملية اتنادت مرتين (retry شبكة، toggle سريع...).
 */
@Entity('notifications')
@Index(['studentId', 'isRead'])
@Index(['studentId', 'type', 'sourceKey'], { unique: true })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  studentId: string

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType

  @Column()
  title: string

  @Column({ type: 'text' })
  body: string

  /** بيانات إضافية للـ deep-link في التطبيق (مثلاً { courseId }) */
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, string> | null

  @Column({ default: false })
  isRead: boolean

  @Column()
  sourceKey: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
