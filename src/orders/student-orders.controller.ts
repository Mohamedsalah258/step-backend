import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { CurrentStudent } from '../student-auth/current-student.decorator'
import type { StudentJwtPayload } from '../student-auth/student-jwt.strategy'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'

/** تقديم ومتابعة طلبات الشراء من تطبيق الطالب — كل الـ routes هنا بتخص
 * طلبات الطالب المسجّل دخول نفسه بس (عكس OrdersController العادي للأدمن). */
@Public()
@UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('student-orders')
@Controller('student/orders')
export class StudentOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Body() dto: CreateOrderDto, @CurrentStudent() student: StudentJwtPayload) {
    return this.ordersService.createForStudent(dto, student.sub)
  }

  @Get()
  listMine(@CurrentStudent() student: StudentJwtPayload) {
    return this.ordersService.listMine(student.sub)
  }

  @Get(':id')
  getMine(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.ordersService.getMineDetail(id, student.sub)
  }
}
