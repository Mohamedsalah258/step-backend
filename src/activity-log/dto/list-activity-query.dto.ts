import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator'

export class ListActivityQueryDto {
  @ApiPropertyOptional({ description: 'بحث بالطالب، الإيميل أو الكورس' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({ description: 'مفتاح نوع العملية (شوف ActionType)' })
  @IsOptional()
  @IsString()
  actionType?: string

  @ApiPropertyOptional({ description: 'تاريخ محدد بصيغة YYYY-MM-DD' })
  @IsOptional()
  @IsISO8601()
  date?: string

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
