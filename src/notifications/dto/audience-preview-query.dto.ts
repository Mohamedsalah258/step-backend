import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsUUID } from 'class-validator'

export class AudiencePreviewQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courseId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stageId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  termId?: string
}
