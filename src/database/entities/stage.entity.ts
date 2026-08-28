import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AcademicStatus } from './academic-status.enum'
import { Specialization } from './specialization.entity'

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @ManyToOne(() => Specialization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specializationId' })
  specialization: Specialization

  @Column()
  specializationId: string

  @Column({ type: 'enum', enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  status: AcademicStatus
}
