import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { SupportTicket } from './support-ticket.entity'
import { SupportTicketSenderType } from './support-ticket-sender-type.enum'

/** رسالة واحدة في محادثة التذكرة — رسالة فتح التذكرة نفسها متخزنة هنا
 * كمان (أول صف)، مش بس الردود اللي بعدها. */
@Entity('support_ticket_messages')
export class SupportTicketMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => SupportTicket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: SupportTicket

  @Column()
  ticketId: string

  @Column({ type: 'enum', enum: SupportTicketSenderType })
  senderType: SupportTicketSenderType

  /** اسم وقت الإرسال (denormalized) — يفضل صحيح حتى لو الاسم اتغيّر بعدين */
  @Column()
  senderName: string

  @Column({ nullable: true })
  senderStudentId: string | null

  @Column({ nullable: true })
  senderAdminId: string | null

  @Column({ type: 'text' })
  message: string

  /** id بتاع UploadedFile — بدون FK رسمية، نفس نمط fileId في باقي المشروع */
  @Column({ nullable: true })
  attachmentFileId: string | null

  /** ملاحظة داخلية للأدمن بس — الطالب مايشوفهاش خالص */
  @Column({ default: false })
  isInternal: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
