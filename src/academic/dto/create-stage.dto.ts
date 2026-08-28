import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { AcademicStatus } from '../../database/entities/academic-status.enum'

export class CreateStageDto {
  @ApiProperty()
  @IsUUID()
  specializationId: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ enum: AcademicStatus, required: false, default: AcademicStatus.ACTIVE })
  @IsOptional()
  @IsEnum(AcademicStatus)
  status?: AcademicStatus
}
