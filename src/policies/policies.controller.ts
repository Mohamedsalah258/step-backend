import { BadRequestException, Body, Controller, Get, Param, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { PolicyType } from '../database/entities/policy-type.enum'
import { PoliciesService } from './policies.service'
import { UpdatePolicyDto } from './dto/update-policy.dto'

const SLUG_TO_TYPE: Record<string, PolicyType> = {
  privacy: PolicyType.PRIVACY,
  refund: PolicyType.REFUND,
  terms: PolicyType.TERMS,
}

function resolveType(slug: string): PolicyType {
  const type = SLUG_TO_TYPE[slug]
  if (!type) throw new BadRequestException('نوع الصفحة غير معروف')
  return type
}

@ApiBearerAuth()
@ApiTags('policies')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get(':slug')
  getByType(@Param('slug') slug: string) {
    return this.policiesService.getByType(resolveType(slug))
  }

  @Patch(':slug')
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdatePolicyDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.policiesService.update(resolveType(slug), dto, admin)
  }
}
