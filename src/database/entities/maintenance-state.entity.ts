import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/** صف واحد singleton — حالة وضع الصيانة الحالية */
@Entity('maintenance_state')
export class MaintenanceState {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ default: false })
  isActive: boolean

  @Column({ type: 'text' })
  message: string

  @Column({ nullable: true })
  updatedByAdminName: string | null

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
