import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'

export type OrdersTab = 'all' | 'pending' | 'approved' | 'rejected'

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ description: 'بحث باسم الطالب أو الرقم المرجعي' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ enum: ['all', 'pending', 'approved', 'rejected'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'pending', 'approved', 'rejected'])
  tab?: OrdersTab = 'all'

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string

  @ApiPropertyOptional()
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

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10
}
