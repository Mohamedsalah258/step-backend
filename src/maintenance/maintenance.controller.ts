import { Body, Controller, Get, Patch } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { Public } from '../auth/public.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { MaintenanceService } from './maintenance.service'
import { UpdateMaintenanceMessageDto } from './dto/update-maintenance-message.dto'

@ApiTags('maintenance')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  /** لتطبيق الطالب لاحقًا — لازم يتقرا من غير تسجيل دخول عشان يعرض شاشة الصيانة */
  @Public()
  @Get()
  getState() {
    return this.maintenanceService.getState()
  }

  @ApiBearerAuth()
  @Get('log')
  log() {
    return this.maintenanceService.log()
  }

  @ApiBearerAuth()
  @Patch('message')
  updateMessage(
    @Body() dto: UpdateMaintenanceMessageDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.maintenanceService.updateMessage(dto, admin)
  }

  @ApiBearerAuth()
  @Patch('toggle')
  toggle(@CurrentAdmin() admin: JwtPayload) {
    return this.maintenanceService.toggle(admin)
  }
}
