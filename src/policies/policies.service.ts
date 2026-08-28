import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Policy } from '../database/entities/policy.entity'
import { PolicyType } from '../database/entities/policy-type.enum'
import type { JwtPayload } from '../auth/jwt.strategy'
import { UpdatePolicyDto } from './dto/update-policy.dto'

@Injectable()
export class PoliciesService {
  constructor(@InjectRepository(Policy) private policiesRepo: Repository<Policy>) {}

  async getByType(type: PolicyType) {
    const policy = await this.policiesRepo.findOne({ where: { type } })
    if (!policy) throw new NotFoundException('الصفحة غير موجودة')
    return this.toDoc(policy)
  }

  async update(type: PolicyType, dto: UpdatePolicyDto, admin: JwtPayload) {
    const policy = await this.policiesRepo.findOne({ where: { type } })
    if (!policy) throw new NotFoundException('الصفحة غير موجودة')
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
}
