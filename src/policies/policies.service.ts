import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Policy } from '../database/entities/policy.entity'
import { PolicyType } from '../database/entities/policy-type.enum'
import type { JwtPayload } from '../auth/jwt.strategy'
import { UpdatePolicyDto } from './dto/update-policy.dto'

const DEFAULT_HEADING: Record<PolicyType, string> = {
  [PolicyType.PRIVACY]: 'سياسة الخصوصية',
  [PolicyType.REFUND]: 'سياسة الاسترجاع والاستبدال',
  [PolicyType.TERMS]: 'الشروط والأحكام',
  [PolicyType.DELETION]: 'سياسة حذف الحساب والبيانات',
}

const DEFAULT_CONTENT = 'محتوى الصفحة لسه ما اتكتبش — عدّله من هنا.'

@Injectable()
export class PoliciesService {
  constructor(@InjectRepository(Policy) private policiesRepo: Repository<Policy>) {}

  async getByType(type: PolicyType) {
    const policy = await this.mustPolicy(type)
    return this.toDoc(policy)
  }

  async update(type: PolicyType, dto: UpdatePolicyDto, admin: JwtPayload) {
    const policy = await this.mustPolicy(type)
    policy.heading = dto.heading
    policy.content = dto.content
    policy.updatedByAdminName = admin.name
    await this.policiesRepo.save(policy)
    return { ok: true }
  }

  private toDoc(p: Policy) {
    return {
      type: p.type,
      heading: p.heading,
      paragraphs: p.content.split('\n\n').filter(Boolean),
      content: p.content,
      updatedAt: p.updatedAt.toISOString(),
      updatedByAdminName: p.updatedByAdminName,
    }
  }

  /** أول زيارة لأي نوع صفحة (زي نشر جديد لسه محدش فتح الصفحة فيه) بيتعمله
   * صف افتراضي تلقائي بدل ما يرجع 404 — نفس نمط mustState في
   * MaintenanceService/ProfileLockService. */
  private async mustPolicy(type: PolicyType): Promise<Policy> {
    const existing = await this.policiesRepo.findOne({ where: { type } })
    if (existing) return existing
    return this.policiesRepo.save(
      this.policiesRepo.create({
        type,
        heading: DEFAULT_HEADING[type],
        content: DEFAULT_CONTENT,
      }),
    )
  }
}
