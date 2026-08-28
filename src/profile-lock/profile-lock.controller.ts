import { Controller, Get, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { ProfileLockService } from './profile-lock.service'

@ApiBearerAuth()
@ApiTags('profile-lock')
@Controller('profile-lock')
export class ProfileLockController {
  constructor(private readonly profileLockService: ProfileLockService) {}

  @Get()
  getState() {
    return this.profileLockService.getState()
  }

  @Patch('toggle')
  toggle(@CurrentAdmin() admin: JwtPayload) {
    return this.profileLockService.toggle(admin)
  }
}
