import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Course } from './course.entity'
import { CourseContentType } from './course-content-type.enum'

/**
 * جدول واحد لكل أنواع محتوى الكورس (فيديو/مذكرة/ملخص/امتحان) بدل 4 جداول
 * شبه متطابقة — الفرق الوحيد الحقيقي بينهم إن الفيديو ممكن يكون externalUrl
 * بدل ملف مرفوع، والباقي لازم fileId. الفرونت لسه بيتعامل معاهم كـ 4 تابات
 * منفصلة (endpoints مفلترة بـ type)، الفرق هنا تفصيل تنفيذي داخلي بس.
 */
@Entity('course_content_items')
export class CourseContentItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course

  @Column()
  courseId: string

  @Column({ type: 'enum', enum: CourseContentType })
  type: CourseContentType

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  /** id بتاع UploadedFile — مطلوب لكل الأنواع ما عدا VIDEO لو استخدم externalUrl */
  @Column({ nullable: true })
  fileId: string | null

  /** VIDEO بس — رابط خارجي بديل عن رفع ملف */
  @Column({ nullable: true })
  externalUrl: string | null

  @Column({ type: 'int', default: 0 })
  order: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
