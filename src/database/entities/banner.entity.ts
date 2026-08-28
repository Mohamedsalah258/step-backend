import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { BannerType } from './banner-type.enum'

/** بنر إعلاني/إعلامي — بيظهر لتطبيق الطالب عبر GET /banners/active (@Public) */
@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ type: 'enum', enum: BannerType, default: BannerType.PROMOTIONAL })
  type: BannerType

  /** id بتاع UploadedFile — بدون FK رسمية، نفس نمط fileId في الكورسات */
  @Column({ nullable: true })
  imageFileId: string | null

  @Column({ default: true })
  isActive: boolean

  /** ترتيب العرض بين البنرات */
  @Column({ type: 'int', default: 0 })
  order: number

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
