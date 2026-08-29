import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/** تصنيفات تذاكر الدعم (مشكلة تقنية/شكوى دفع/استفسار عام...) — إدارية،
 * حذفها soft-delete (isActive=false) عشان التذاكر القديمة تفضل مرتبطة بيها. */
@Entity('support_ticket_categories')
export class SupportTicketCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  @Column({ default: true })
  isActive: boolean

  @Column({ type: 'int', default: 0 })
  order: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
