import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * رسالة "تواصل مع الدعم" من زائر مش مسجّل دخول (زر في شاشة اللوجين — نسيت
 * الباسورد، مش عارف يسجل، إلخ). مفيش محادثة ثنائية هنا زي SupportTicket —
 * الرد بيحصل بإيميل عادي رد مباشر على emailForReply (شوف ContactSupportService).
 */
@Entity('contact_support_messages')
export class ContactSupportMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true })
  name: string | null

  @Column()
  emailForReply: string

  @Column({ type: 'text' })
  message: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
