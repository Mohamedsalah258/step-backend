import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { PaymentsService } from './payments.service'

/** طرق الدفع اللي الطالب يشوفها وقت تقديم طلب شراء — النشطة بس */
@Public()
@UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('student-payment-methods')
@Controller('student/payment-methods')
export class StudentPaymentMethodsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list() {
    return this.paymentsService.listActive()
  }
}
