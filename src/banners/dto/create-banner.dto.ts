import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator'
import { BannerType } from '../../database/entities/banner-type.enum'

export class CreateBannerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ enum: BannerType })
  @IsEnum(BannerType)
  type: BannerType

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
