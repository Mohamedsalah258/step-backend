import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'

/** حدود الطول عشان الإشعار كله (title+body+data) يفضل تحت حد الـ 4KB بتاع
 * حمولة FCM — لو اتعدى، الإرسال كله ممكن يفشل للـ batch كله مش الرسالة دي بس. */
const TITLE_MAX_LENGTH = 150
const BODY_MAX_LENGTH = 1000

export class SendCustomNotificationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(TITLE_MAX_LENGTH)
  title: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(BODY_MAX_LENGTH)
  body: string

  @ApiPropertyOptional({ description: 'حاليًا "عام" بس من الفرونت' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
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
