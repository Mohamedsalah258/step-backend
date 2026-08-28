import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AcademicStatus } from './academic-status.enum'
import { College } from './college.entity'

@Entity('specializations')
export class Specialization {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College

  @Column()
  collegeId: string

  @Column({ type: 'enum', enum: AcademicStatus, default: AcademicStatus.ACTIVE })
  status: AcademicStatus
}
