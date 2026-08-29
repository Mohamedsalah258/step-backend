import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator'
import { SupportTicketStatus } from '../../database/entities/support-ticket-status.enum'
import { SupportTicketPriority } from '../../database/entities/support-ticket-priority.enum'

export type TicketsTab = 'all' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'

export class ListTicketsQueryDto {
  @ApiPropertyOptional({ description: 'بحث بعنوان التذكرة أو اسم الطالب' })
  @IsOptional()
  @IsString()
  q?: string

  @ApiPropertyOptional({
    enum: ['all', 'open', 'in_progress', 'resolved', 'closed', 'cancelled'],
    default: 'all',
  })
  @IsOptional()
  @IsString()
  tab?: TicketsTab = 'all'

  @ApiPropertyOptional({ enum: SupportTicketPriority })
  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assignedAdminId?: string

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10
}
