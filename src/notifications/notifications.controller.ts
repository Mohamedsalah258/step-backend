import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { NotificationsService } from './notifications.service'
import { SendCustomNotificationDto } from './dto/send-custom-notification.dto'
import { AudiencePreviewQueryDto } from './dto/audience-preview-query.dto'
import { ListNotificationBatchesQueryDto } from './dto/list-notification-batches-query.dto'
import { AdminAlertsQueryDto } from './dto/admin-alerts-query.dto'

/** شاشة "الإشعارات" بالداشبورد — إرسال إشعار مخصّص للطلاب + سجل الإرسالات السابقة */
@ApiBearerAuth()
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('audience-preview')
  audiencePreview(@Query() query: AudiencePreviewQueryDto) {
    return this.notificationsService.previewAudience(query.courseId, query.stageId, query.termId)
  }

  /** حد أضيق من الافتراضي — إرسال جماعي (لآلاف الطلاب المرة) خطر أعلى من
   * أي endpoint تاني لو حساب أدمن اتخترق أو حصل استخدام غلط. */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('send')
  send(@Body() dto: SendCustomNotificationDto, @CurrentAdmin() admin: JwtPayload) {
    return this.notificationsService.sendCustomNotification(dto, admin)
  }

  @Get('history')
  history(@Query() query: ListNotificationBatchesQueryDto) {
    return this.notificationsService.listBatches(query.page ?? 1, query.limit ?? 10)
  }

  @Get('admin-alerts')
  adminAlerts(@Query() query: AdminAlertsQueryDto) {
    return this.notificationsService.adminAlerts(query.limit ?? 5)
  }
}
