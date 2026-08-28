import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AcademicStatus } from './academic-status.enum'
import { Stage } from './stage.entity'

@Entity('terms')
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage

  @Column()
  stageId: string

  @Column({ type: 'enum', enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  status: AcademicStatus
}
