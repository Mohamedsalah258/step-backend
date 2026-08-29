import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Student } from './student.entity'
import { SupportTicketCategory } from './support-ticket-category.entity'
import { SupportTicketMessage } from './support-ticket-message.entity'
import { SupportTicketStatus } from './support-ticket-status.enum'
import { SupportTicketPriority } from './support-ticket-priority.enum'

/** تذكرة دعم — بديل التواصل عن طريق واتساب. المحادثة الفعلية (بما فيها
 * رسالة الفتح نفسها) متخزنة في SupportTicketMessage، مش هنا. */
@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @ManyToOne(() => SupportTicketCategory, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: SupportTicketCategory | null

  @Column({ nullable: true })
  categoryId: string | null

  @Column()
  subject: string

  @Column({ type: 'text' })
  description: string

  @Column({ type: 'enum', enum: SupportTicketPriority, default: SupportTicketPriority.MEDIUM })
  priority: SupportTicketPriority

  @Column({ type: 'enum', enum: SupportTicketStatus, default: SupportTicketStatus.OPEN })
  status: SupportTicketStatus

  /** بدون FK رسمية على Admin — نفس نمط adminId/adminName في ActivityLog */
  @Column({ nullable: true })
  assignedAdminId: string | null

  @Column({ nullable: true })
  assignedAdminName: string | null

  /** إجباري قبل ما الحالة تتحول RESOLVED — شوف TicketsService.updateStatus */
  @Column({ type: 'text', nullable: true })
  resolution: string | null

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => SupportTicketMessage, (m) => m.ticket)
  messages: SupportTicketMessage[]
}
