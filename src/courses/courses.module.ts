import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Course } from '../database/entities/course.entity'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { CourseContentItem } from '../database/entities/course-content-item.entity'
import { ContentProgress } from '../database/entities/content-progress.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { CoursesController, CourseContentController } from './courses.controller'
import { StudentCoursesController } from './student-courses.controller'
import { CoursesService } from './courses.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Course,
      University,
      College,
      Specialization,
      Stage,
      Term,
      CourseContentItem,
      ContentProgress,
      Subscription,
      PurchaseRequest,
      ActivityLog,
    ]),
    MaintenanceModule,
    NotificationsModule,
  ],
  controllers: [CoursesController, CourseContentController, StudentCoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
