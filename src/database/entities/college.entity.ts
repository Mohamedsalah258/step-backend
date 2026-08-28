import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AcademicStatus } from './academic-status.enum'
import { University } from './university.entity'

@Entity('colleges')
export class College {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'universityId' })
  university: University

  @Column()
  universityId: string

  @Column({ type: 'enum', enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  status: AcademicStatus
}
