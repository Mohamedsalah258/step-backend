import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { StudentsService } from './students.service'
import { ListStudentsQueryDto } from './dto/list-students-query.dto'
import { OpenCourseDto } from './dto/open-course.dto'

@ApiBearerAuth()
@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Get()
  list(@Query() query: ListStudentsQueryDto) {
    return this.studentsService.list(query)
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.studentsService.getDetail(id)
  }

  @Post(':id/ban')
  ban(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.studentsService.ban(id, admin)
  }

  @Post(':id/unban')
  unban(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.studentsService.unban(id, admin)
  }

  @Post(':id/device-reset')
  deviceReset(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.studentsService.deviceReset(id, admin)
  }

  @Post(':id/profile-unlock')
  unlockProfile(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.studentsService.unlockProfile(id, admin)
  }

  @Post(':id/profile-lock')
  lockProfile(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.studentsService.lockProfile(id, admin)
  }

  @Post(':id/subscriptions/:subId/cancel')
  cancelSubscription(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.studentsService.cancelSubscription(id, subId, admin)
  }

  @Post(':id/subscriptions/:subId/reactivate')
  reactivateSubscription(
    @Param('id') id: string,
    @Param('subId') subId: string,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.studentsService.reactivateSubscription(id, subId, admin)
  }

  @Post(':id/subscriptions/open')
  openCourse(
    @Param('id') id: string,
    @Body() dto: OpenCourseDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.studentsService.openCourse(id, dto, admin)
  }
}
