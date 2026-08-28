import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsUUID, Min } from 'class-validator'

/**
 * query موحّد لكل قوائم الهيكل الأكاديمي — page/limit زي أي list تانية
 * في المشروع (شوف common/paginated-result.ts)، وparentId اختياري لفلترة
 * المستوى بحسب أبوه المباشر (مثلاً كليات جامعة معيّنة).
 */
export class AcademicListQueryDto {
  @ApiPropertyOptional({ description: 'فلترة بحسب المستوى الأب المباشر (اختياري)' })
  @IsOptional()
  @IsUUID()
  parentId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50
}
