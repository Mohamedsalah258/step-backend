import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentMethod } from '../database/entities/payment-method.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { PaymentsController } from './payments.controller'
import { StudentPaymentMethodsController } from './student-payment-methods.controller'
import { PaymentsService } from './payments.service'

@Module({
  imports: [TypeOrmModule.forFeature([PaymentMethod]), MaintenanceModule],
  controllers: [PaymentsController, StudentPaymentMethodsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
