import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

/** سجل فترة صيانة واحدة — بيتسجل تلقائي وقت تفعيل/تعطيل وضع الصيانة */
@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'timestamptz' })
  startedAt: Date

  /** null لحد ما وضع الصيانة يتقفل */
  @Column({ type: 'timestamptz', nullable: true })
  endedAt: Date | null

  @Column({ type: 'text' })
  reason: string

  @Column({ nullable: true })
  byAdminName: string | null
}
