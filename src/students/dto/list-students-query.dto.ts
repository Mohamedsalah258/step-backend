import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export type StudentsTab = 'all' | 'active' | 'banned'

export class ListStudentsQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالاسم أو الإيميل' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ enum: ['all', 'active', 'banned'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'active', 'banned'])
  tab?: StudentsTab = 'all'

  @ApiPropertyOptional({ description: 'فلترة بحسب اسم الكورس (اشتراك فعّال فيه)' })
  @IsOptional()
  @IsString()
  course?: string

  @ApiPropertyOptional({ description: 'فلترة بمطابقة دقيقة لـ id الكورس (بديل عن course بالاسم)' })
  @IsOptional()
  @IsUUID()
  courseId?: string

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

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 8
}
