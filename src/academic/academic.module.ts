import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { Course } from '../database/entities/course.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { AcademicController } from './academic.controller'
import { AcademicService } from './academic.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      University,
      College,
      Specialization,
      Stage,
      Term,
      Course,
      Subscription,
      ActivityLog,
    ]),
  ],
  controllers: [AcademicController],
  providers: [AcademicService],
  exports: [AcademicService],
})
export class AcademicModule {}
