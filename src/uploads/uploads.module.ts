import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UploadedFile } from '../database/entities/uploaded-file.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { UploadsController } from './uploads.controller'
import { UploadsService } from './uploads.service'

@Module({
  imports: [TypeOrmModule.forFeature([UploadedFile]), MaintenanceModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
