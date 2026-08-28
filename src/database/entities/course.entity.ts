import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { University } from './university.entity'
import { College } from './college.entity'
import { Specialization } from './specialization.entity'
import { Stage } from './stage.entity'
import { Term } from './term.entity'
import { CourseStatus } from './course-status.enum'

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @ManyToOne(() => University, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'universityId' })
  university: University

  @Column()
  universityId: string

  @ManyToOne(() => College, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collegeId' })
  college: College

  @Column()
  collegeId: string

  @ManyToOne(() => Specialization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'specializationId' })
  specialization: Specialization

  @Column()
  specializationId: string

  @ManyToOne(() => Stage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stageId' })
  stage: Stage

  @Column()
  stageId: string

  @ManyToOne(() => Term, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'termId' })
  term: Term

  @Column()
  termId: string

  /** جنيه مصري — integer، شوف common/paginated-result.ts + Phase 0.3 */
  @Column({ type: 'int', default: 0 })
  price: number

  @Column({ default: false })
  isFree: boolean

  /** id بتاع UploadedFile — بدون FK رسمية (نفس نمط fileId في المحتوى) */
  @Column({ nullable: true })
  coverFileId: string | null

  @Column({ type: 'enum', enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus

  /** ترتيب العرض بين الكورسات (مدخل يدوي من الأدمن وقت الإضافة) */
  @Column({ type: 'int', default: 0 })
  order: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
