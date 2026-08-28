import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { AcademicStatus } from './academic-status.enum'

@Entity('universities')
export class University {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  status: AcademicStatus

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
