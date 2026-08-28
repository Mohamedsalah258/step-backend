import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Student } from './student.entity'

/** يقابل STUDENT_RESET_LOG / ResetLogRow */
@Entity('reset_logs')
export class ResetLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Student, (s) => s.resetLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @Column()
  deviceModel: string

  /** اسم الأدمن اللي نفّذ العملية، أو 'النظام (تلقائي)' */
  @Column({ default: 'النظام (تلقائي)' })
  byAdmin: string

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
