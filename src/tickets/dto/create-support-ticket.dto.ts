import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'
import { SupportTicketPriority } from '../../database/entities/support-ticket-priority.enum'

export class CreateSupportTicketDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  subject: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiPropertyOptional({ enum: SupportTicketPriority })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority

  @ApiPropertyOptional({ description: 'fileId بتاع مرفق اختياري مع رسالة الفتح' })
  @IsOptional()
  @IsUUID()
  attachmentFileId?: string
}
