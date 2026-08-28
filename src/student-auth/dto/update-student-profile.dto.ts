import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class UpdateStudentProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  phone?: string

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

  @ApiPropertyOptional({ description: 'المستوى — محكوم بقفل تعديل البيانات الأكاديمية' })
  @IsOptional()
  @IsUUID()
  stageId?: string

  @ApiPropertyOptional({ description: 'الترم — محكوم بقفل تعديل البيانات الأكاديمية' })
  @IsOptional()
  @IsUUID()
  termId?: string
}
