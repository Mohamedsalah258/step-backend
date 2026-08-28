import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ProfileLockState } from '../database/entities/profile-lock-state.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ActionType } from '../common/action-catalog'
import type { JwtPayload } from '../auth/jwt.strategy'
import { Student } from '../database/entities/student.entity'

@Injectable()
export class ProfileLockService {
  constructor(
    @InjectRepository(ProfileLockState) private stateRepo: Repository<ProfileLockState>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
  ) {}

  async getState() {
    const state = await this.mustState()
    return {
      isLocked: state.isLocked,
      updatedAt: state.updatedAt.toISOString(),
      updatedByAdminName: state.updatedByAdminName,
    }
  }

  /** بيقفل/يفتح تعديل البيانات الأكاديمية (المستوى/الترم) لكل الطلاب دفعة واحدة */
  async toggle(admin: JwtPayload) {
    const state = await this.mustState()
    state.isLocked = !state.isLocked
    state.updatedByAdminName = admin.name
    await this.stateRepo.save(state)

    await this.activityRepo.save(
      this.activityRepo.create({
        actionType: state.isLocked ? ActionType.PROFILE_LOCK_ON : ActionType.PROFILE_LOCK_OFF,
        studentId: null,
        studentNameSnapshot: null,
        courseNameSnapshot: null,
        adminId: admin.sub,
        adminName: admin.name,
      }),
    )

    return { ok: true, isLocked: state.isLocked }
  }

  /** استثناء الطالب (لو مفتوح له يدويًا) بيتجاهل القفل العام */
  async isLockedForStudent(student: Pick<Student, 'profileEditUnlocked'>): Promise<boolean> {
    if (student.profileEditUnlocked) return false
    const state = await this.mustState()
    return state.isLocked
  }

  private async mustState(): Promise<ProfileLockState> {
    const existing = await this.stateRepo.find({ take: 1 })
    if (existing.length > 0) return existing[0]
    return this.stateRepo.save(this.stateRepo.create({ isLocked: false }))
  }
}
