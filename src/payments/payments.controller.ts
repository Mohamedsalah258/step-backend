import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { PaymentsService } from './payments.service'
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto'
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto'

@ApiBearerAuth()
@ApiTags('payments')
@Controller('payment-methods')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  list() {
    return this.paymentsService.list()
  }

  @Post()
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentsService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.paymentsService.update(id, dto)
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.paymentsService.toggle(id)
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.paymentsService.delete(id)
  }
}
