import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '../database/entities/student.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { Course } from '../database/entities/course.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { DashboardController } from './dashboard.controller'
import { DashboardService } from './dashboard.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, Subscription, ActivityLog, Course, PurchaseRequest]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
