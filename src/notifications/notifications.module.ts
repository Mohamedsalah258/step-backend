import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Notification } from '../database/entities/notification.entity'
import { NotificationBatch } from '../database/entities/notification-batch.entity'
import { Student } from '../database/entities/student.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { Course } from '../database/entities/course.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { StudentNotificationsController } from './student-notifications.controller'
import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationBatch,
      Student,
      Subscription,
      Course,
      Stage,
      Term,
      ActivityLog,
      PurchaseRequest,
    ]),
    MaintenanceModule,
  ],
  controllers: [StudentNotificationsController, NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
