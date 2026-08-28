import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

/**
 * صف واحد singleton — حالة قفل تعديل البيانات الأكاديمية (المستوى/الترم)
 * لكل الطلاب. الاستثناء لطالب معيّن متخزن على Student.profileEditUnlocked
 * نفسه، مش هنا (شوف ProfileLockService.isLockedForStudent).
 */
@Entity('profile_lock_state')
export class ProfileLockState {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ default: false })
  isLocked: boolean

  @Column({ nullable: true })
  updatedByAdminName: string | null

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date
}
