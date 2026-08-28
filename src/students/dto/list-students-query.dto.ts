import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator'
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
  limit?: number = 8
}
