import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CourseStatus } from '../../database/entities/course-status.enum'

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty()
  @IsUUID()
  universityId: string

  @ApiProperty()
  @IsUUID()
  collegeId: string

  @ApiProperty()
  @IsUUID()
  specializationId: string

  @ApiProperty()
  @IsUUID()
  stageId: string

  @ApiProperty()
  @IsUUID()
  termId: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverFileId?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number

  @ApiPropertyOptional({ enum: CourseStatus, default: CourseStatus.DRAFT })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus
}
