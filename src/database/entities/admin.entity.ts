import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm'

/**
 * حساب المدير (Admin) — الوحيد المسموح له يدخل لوحة التحكم.
 * التسجيل محمي بـ ADMIN_INVITE_CODE (سر مشترك في .env) عشان محدش يقدر
 * يعمل POST /auth/register من برّه ويفتح لنفسه حساب أدمن.
 */
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column({ unique: true })
  email!: string

  @Column()
  passwordHash!: string

  @Column()
  name!: string

  /** id بتاع UploadedFile — بدون FK رسمية، نفس نمط fileId في الكورسات/البنرات */
  @Column({ nullable: true })
  avatarFileId!: string | null

  @CreateDateColumn()
  createdAt!: Date
}
