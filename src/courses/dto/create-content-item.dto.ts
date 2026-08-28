import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateContentItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ description: 'مطلوب لكل الأنواع ما عدا فيديو بـ externalUrl' })
  @IsOptional()
  @IsString()
  fileId?: string

  @ApiPropertyOptional({ description: 'فيديو بس — بديل عن fileId' })
  @IsOptional()
  @IsUrl()
  externalUrl?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  order?: number
}
