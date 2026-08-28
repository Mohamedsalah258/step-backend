import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import { MaintenanceState } from '../database/entities/maintenance-state.entity'
import { MaintenanceLog } from '../database/entities/maintenance-log.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ActionType } from '../common/action-catalog'
import type { JwtPayload } from '../auth/jwt.strategy'
import { UpdateMaintenanceMessageDto } from './dto/update-maintenance-message.dto'

const DEFAULT_MESSAGE = 'المنصة تحت الصيانة حالياً — سنعود قريباً إن شاء الله'

function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  const hours = Math.round(ms / (1000 * 60 * 60))
  if (hours >= 1) return `${hours} ساعة`
  const minutes = Math.max(1, Math.round(ms / (1000 * 60)))
  return `${minutes} دقيقة`
}

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceState) private stateRepo: Repository<MaintenanceState>,
    @InjectRepository(MaintenanceLog) private logRepo: Repository<MaintenanceLog>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
  ) {}

  async getState() {
    const state = await this.mustState()
    return {
      isActive: state.isActive,
      message: state.message,
      updatedAt: state.updatedAt.toISOString(),
      updatedByAdminName: state.updatedByAdminName,
    }
  }

  async updateMessage(dto: UpdateMaintenanceMessageDto, admin: JwtPayload) {
    const state = await this.mustState()
    state.message = dto.message
    state.updatedByAdminName = admin.name
    await this.stateRepo.save(state)
    return { ok: true }
  }

  /** بيفتح/يقفل سجل فترة صيانة تلقائي مع كل تبديل */
  async toggle(admin: JwtPayload) {
    const state = await this.mustState()
    state.isActive = !state.isActive
    state.updatedByAdminName = admin.name
    await this.stateRepo.save(state)

    if (state.isActive) {
      await this.logRepo.save(
        this.logRepo.create({
          startedAt: new Date(),
          endedAt: null,
          reason: state.message,
          byAdminName: admin.name,
        }),
      )
    } else {
      const open = await this.logRepo.findOne({
        where: { endedAt: IsNull() },
        order: { startedAt: 'DESC' },
      })
      if (open) {
        open.endedAt = new Date()
        await this.logRepo.save(open)
      }
    }

    await this.activityRepo.save(
      this.activityRepo.create({
        actionType: state.isActive ? ActionType.MAINTENANCE_ON : ActionType.MAINTENANCE_OFF,
        studentId: null,
        studentNameSnapshot: null,
        courseNameSnapshot: null,
        adminId: admin.sub,
        adminName: admin.name,
      }),
    )

    return { ok: true, isActive: state.isActive }
  }

  async log() {
    const rows = await this.logRepo.find({
      where: { endedAt: Not(IsNull()) },
      order: { startedAt: 'DESC' },
      take: 10,
    })
    return rows.map((r) => ({
      id: r.id,
      date: r.startedAt.toISOString().slice(0, 10),
      duration: formatDuration(r.startedAt, r.endedAt!),
      reason: r.reason,
    }))
  }

  private async mustState(): Promise<MaintenanceState> {
    const existing = await this.stateRepo.find({ take: 1 })
    if (existing.length > 0) return existing[0]
    return this.stateRepo.save(
      this.stateRepo.create({ isActive: false, message: DEFAULT_MESSAGE }),
    )
  }
}
