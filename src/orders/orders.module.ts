import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { Course } from '../database/entities/course.entity'
import { PaymentMethod } from '../database/entities/payment-method.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { UploadsModule } from '../uploads/uploads.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { OrdersController } from './orders.controller'
import { StudentOrdersController } from './student-orders.controller'
import { OrdersService } from './orders.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([PurchaseRequest, Subscription, Course, PaymentMethod, ActivityLog]),
    MaintenanceModule,
    UploadsModule,
    NotificationsModule,
  ],
  controllers: [OrdersController, StudentOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
