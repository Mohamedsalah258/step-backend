import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { PolicyType } from './policy-type.enum'

/** صفحة سياسة ثابتة (خصوصية/استرجاع/شروط) — صف واحد لكل نوع (unique) */
@Entity('policies')
export class Policy {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'enum', enum: PolicyType, unique: true })
  type: PolicyType

  @Column()
  heading: string

  /** فقرات النص مفصولة بسطر فاضي — الفرونت بيقسمها للعرض */
  @Column({ type: 'text' })
  content: string

  @Column({ nullable: true })
  updatedByAdminName: string | null

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
