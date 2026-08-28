import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { AcademicStatus } from '../../database/entities/academic-status.enum'

/**
 * جسم موحّد للتعديل على أي مستوى في الهيكل الأكاديمي — الاسم والحالة بس
 * قابلين للتعديل (مش الأب، عشان مانفتحش باب نقل عقدة لأب تاني من غير قصد).
 */
export class UpdateAcademicNodeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @ApiPropertyOptional({ enum: AcademicStatus })
  @IsOptional()
  @IsEnum(AcademicStatus)
  status?: AcademicStatus
}
