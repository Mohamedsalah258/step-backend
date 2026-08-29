import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { SupportTicketStatus } from '../../database/entities/support-ticket-status.enum'

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: SupportTicketStatus })
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus

  @ApiPropertyOptional({ description: 'إجباري قبل التحويل لـ RESOLVED (لو مش متسجل قبل كده)' })
  @IsOptional()
  @IsString()
  resolution?: string
}
