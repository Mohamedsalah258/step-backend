import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { CurrentStudent } from '../student-auth/current-student.decorator'
import type { StudentJwtPayload } from '../student-auth/student-jwt.strategy'
import { TicketsService } from './tickets.service'
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'

/** تذاكر الدعم من تطبيق الطالب — بديل التواصل عن طريق واتساب. كل الـ
 * routes هنا بتخص تذاكر الطالب المسجّل دخول نفسه بس. */
@Public()
@UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('student-tickets')
@Controller('student/tickets')
export class StudentTicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() dto: CreateSupportTicketDto, @CurrentStudent() student: StudentJwtPayload) {
    return this.ticketsService.createForStudent(dto, student.sub, student.name)
  }

  @Get()
  listMine(@CurrentStudent() student: StudentJwtPayload) {
    return this.ticketsService.listMine(student.sub)
  }

  /** لازم قبل :id عشان الراوتر ميدخلش "categories" كـ id */
  @Get('categories')
  listCategories() {
    return this.ticketsService.listCategoriesForStudent()
  }

  @Get(':id')
  getMine(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.ticketsService.getMineDetail(id, student.sub)
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageDto,
    @CurrentStudent() student: StudentJwtPayload,
  ) {
    return this.ticketsService.addMessageAsStudent(id, dto, student.sub, student.name)
  }
}
