import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export class ListStudentCoursesQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالاسم' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  universityId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collegeId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  specializationId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stageId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  termId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 12
}
