import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { CurrentStudent } from '../student-auth/current-student.decorator'
import type { StudentJwtPayload } from '../student-auth/student-jwt.strategy'
import { NotificationsService } from './notifications.service'
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto'
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto'

/** إشعارات الطالب — تسجيل بوش توكن، قائمة الإشعارات، وتحديد المقروء */
@Public()
@UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('student-notifications')
@Controller('student/notifications')
export class StudentNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Patch('fcm-token')
  registerFcmToken(@Body() dto: RegisterFcmTokenDto, @CurrentStudent() student: StudentJwtPayload) {
    return this.notificationsService.registerPushToken(student.sub, dto.fcmToken)
  }

  @Get()
  list(@Query() query: ListNotificationsQueryDto, @CurrentStudent() student: StudentJwtPayload) {
    return this.notificationsService.list(student.sub, query.page ?? 1, query.limit ?? 20)
  }

  @Get('unread-count')
  unreadCount(@CurrentStudent() student: StudentJwtPayload) {
    return this.notificationsService.unreadCount(student.sub)
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.notificationsService.markRead(student.sub, id)
  }

  @Patch('read-all')
  markAllRead(@CurrentStudent() student: StudentJwtPayload) {
    return this.notificationsService.markAllRead(student.sub)
  }
}
