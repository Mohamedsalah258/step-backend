import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator'

export type CoursesTab = 'all' | 'active' | 'inactive'

export class ListCoursesQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالاسم' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  collegeId?: string

  @ApiPropertyOptional({ enum: ['all', 'active', 'inactive'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  tab?: CoursesTab = 'all'

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10
}
