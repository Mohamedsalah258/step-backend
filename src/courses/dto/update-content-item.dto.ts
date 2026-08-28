import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator'

export class UpdateContentItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'لاستبدال الملف الحالي' })
  @IsOptional()
  @IsString()
  fileId?: string

  @ApiPropertyOptional({ description: 'فيديو بس' })
  @IsOptional()
  @IsUrl()
  externalUrl?: string

  @ApiPropertyOptional({ description: 'نقل العنصر لموضع جديد بين أقرانه (نفس الكورس والنوع)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number
}
