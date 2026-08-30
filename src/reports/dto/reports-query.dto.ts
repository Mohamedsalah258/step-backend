import { ApiPropertyOptional } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBooleanString, IsDateString, IsOptional, IsUUID } from 'class-validator'

/** نص فاضي = "مبعوتش" — بيحصل لو الفرونت بعت `from=&to=` بالغلط */
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' ? undefined : value)

export class ReportsQueryDto {
  @ApiPropertyOptional({ description: 'افتراضي: آخر 30 يوم لو مفيش تاريخ محدد' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  from?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsDateString()
  to?: string

  @ApiPropertyOptional({ description: 'يرجّع مقارنة بالفترة السابقة لو true' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsBooleanString()
  compare?: string

  @ApiPropertyOptional({ description: 'فلترة بحسب الجامعة (لا تنطبق على تقرير الأجهزة)' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  universityId?: string

  @ApiPropertyOptional({ description: 'فلترة بحسب الكلية (لا تنطبق على تقرير الأجهزة)' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  collegeId?: string

  @ApiPropertyOptional({ description: 'فلترة بحسب التخصص (لا تنطبق على تقرير الأجهزة)' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsUUID()
  specializationId?: string
}
