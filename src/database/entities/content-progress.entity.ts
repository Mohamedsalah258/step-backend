import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { Student } from './student.entity'
import { CourseContentItem } from './course-content-item.entity'

/** علامة "الطالب خلّص العنصر ده" — وجود الصف = مكتمل، مفيش صف = لسه.
 * بسيط (إكمال/عدم إكمال) مش تتبّع وقت/موضع تشغيل فعلي. */
@Entity('content_progress')
@Unique(['studentId', 'contentItemId'])
export class ContentProgress {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: Student

  @Column()
  studentId: string

  @ManyToOne(() => CourseContentItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contentItemId' })
  contentItem: CourseContentItem

  @Column()
  contentItemId: string

  @CreateDateColumn({ type: 'timestamptz' })
  completedAt: Date
}
