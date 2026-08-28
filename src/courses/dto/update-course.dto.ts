import { ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { CourseStatus } from '../../database/entities/course-status.enum'

/**
 * كل حاجة قابلة للتعديل — بما فيها الهيكل الأكاديمي (عكس قرار الأكاديمي
 * نفسه). المستخدم طلب مرونة كاملة هنا عشان يقدر يصحح غلطة وقت الإضافة من
 * غير ما يحذف الكورس ويعمله من الأول. لو أي حقل من الخمسة اتبعت، الباك
 * إند بيطلب الخمسة مع بعض (شوف courses.service.ts) عشان يتفادى تناقض
 * (كلية من جامعة، وتخصص من جامعة تانية).
 */
export class UpdateCourseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFree?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverFileId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus
}
