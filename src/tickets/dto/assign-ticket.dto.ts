import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsUUID } from 'class-validator'

export class AssignTicketDto {
  @ApiPropertyOptional({ description: 'اتركه فاضي عشان تلغي التعيين' })
  @IsOptional()
  @IsUUID()
  adminId?: string
}
