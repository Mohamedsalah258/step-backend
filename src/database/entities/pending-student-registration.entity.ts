import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * طلب تسجيل طالب لسه ما اتأكدش بالإيميل — بيانات كاملة (زي كل حقول
 * RegisterStudentDto + الباسورد المشفّر) متخزنة هنا مؤقتًا لحد ما الطالب
 * يبعت كود التحقق الصحيح، وقتها بس Student الحقيقي بيتعمله create
 * (شوف StudentAuthService.verifyRegistrationOtp). لو الطالب سجّل تاني
 * بنفس الإيميل قبل ما يأكد، الصف ده بيتحدّث (upsert) بدل ما يتكرر —
 * نفس فكرة "إعادة الإرسال".
 */
@Entity('pending_student_registrations')
export class PendingStudentRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column()
  name: string

  @Column()
  phone: string

  @Column()
  passwordHash: string

  @Column()
  universityId: string

  @Column()
  collegeId: string

  @Column()
  specializationId: string

  @Column()
  stageId: string

  @Column()
  deviceIdentifier: string

  @Column({ nullable: true })
  deviceModel: string | null

  @Column()
  otpHash: string

  @Column({ type: 'timestamptz' })
  otpExpiresAt: Date

  @Column({ default: 0 })
  otpAttempts: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
