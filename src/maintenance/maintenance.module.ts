import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MaintenanceState } from '../database/entities/maintenance-state.entity'
import { MaintenanceLog } from '../database/entities/maintenance-log.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceGuard } from './maintenance.guard'

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceState, MaintenanceLog, ActivityLog])],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenanceGuard],
  // ⚠️ لازم نصدّر TypeOrmModule كمان (مش بس السيرفس/الحارس) — عشان
  // MaintenanceGuard وقت ما يتحط بـ @UseGuards() في موديول تاني (زي
  // StudentAuthModule) يقدر يحل الـ MaintenanceStateRepository بتاعه.
  exports: [MaintenanceService, MaintenanceGuard, TypeOrmModule],
})
export class MaintenanceModule {}
