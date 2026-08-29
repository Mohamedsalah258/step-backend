import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class SendCustomNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string

  @ApiPropertyOptional({ description: 'حاليًا "عام" بس من الفرونت' })
  @IsOptional()
  @IsString()
  type?: string

  @ApiPropertyOptional({ description: 'استهداف طلاب المشتركين في كورس معيّن' })
  @IsOptional()
  @IsUUID()
  courseId?: string

  @ApiPropertyOptional({ description: 'استهداف حسب المرحلة' })
  @IsOptional()
  @IsUUID()
  stageId?: string

  @ApiPropertyOptional({ description: 'استهداف حسب الترم' })
  @IsOptional()
  @IsUUID()
  termId?: string
}
