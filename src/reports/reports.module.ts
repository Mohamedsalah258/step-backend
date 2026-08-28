import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { Student } from '../database/entities/student.entity'
import { ResetLog } from '../database/entities/reset-log.entity'
import { ReportsController } from './reports.controller'
import { ReportsService } from './reports.service'

@Module({
  imports: [TypeOrmModule.forFeature([PurchaseRequest, Subscription, Student, ResetLog])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
