import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Notification } from '../database/entities/notification.entity'
import { Student } from '../database/entities/student.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { StudentNotificationsController } from './student-notifications.controller'
import { NotificationsService } from './notifications.service'

@Module({
  imports: [TypeOrmModule.forFeature([Notification, Student, Subscription]), MaintenanceModule],
  controllers: [StudentNotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
