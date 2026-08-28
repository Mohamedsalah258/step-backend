import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '../database/entities/student.entity'
import { ResetLog } from '../database/entities/reset-log.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ProfileLockModule } from '../profile-lock/profile-lock.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { StudentsController } from './students.controller'
import { StudentsService } from './students.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Student, ResetLog, Subscription, ActivityLog]),
    ProfileLockModule,
    NotificationsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
