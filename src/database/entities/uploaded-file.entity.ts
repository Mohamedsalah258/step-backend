import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

/**
 * ميتاداتا لكل ملف مرفوع (غلاف كورس/فيديو/PDF) — الملف نفسه متخزّن على
 * القرص المحلي (uploads/ برّه src) تحت اسم `storedFilename` عشوائي.
 * تخزين مؤقت لحد ما يتستبدل بـ S3 حقيقي (شوف الخطة، Phase 2) — أي كود
 * بيستخدم fileId بس، فالاستبدال لاحقًا محصور في UploadsModule.
 */
@Entity('uploaded_files')
export class UploadedFile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  originalName: string

  /** اسم الملف الفعلي على القرص (مش نفس originalName — عشوائي لمنع التصادم) */
  @Column()
  storedFilename: string

  @Column()
  mimeType: string

  @Column({ type: 'int' })
  sizeBytes: number

  @Column({ nullable: true })
  uploadedByAdminId: string | null

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
