import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ProfileLockState } from '../database/entities/profile-lock-state.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ProfileLockController } from './profile-lock.controller'
import { ProfileLockService } from './profile-lock.service'

@Module({
  imports: [TypeOrmModule.forFeature([ProfileLockState, ActivityLog])],
  controllers: [ProfileLockController],
  providers: [ProfileLockService],
  exports: [ProfileLockService],
})
export class ProfileLockModule {}
