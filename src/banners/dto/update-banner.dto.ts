import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'
import { BannerType } from '../../database/entities/banner-type.enum'

export class UpdateBannerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string

  @ApiPropertyOptional({ enum: BannerType })
  @IsOptional()
  @IsEnum(BannerType)
  type?: BannerType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageFileId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
