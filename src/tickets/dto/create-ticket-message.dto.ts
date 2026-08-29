import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator'

export class CreateTicketMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  attachmentFileId?: string

  /** الأدمن بس — بيتجاهل تمامًا لو الطالب بعته (شوف TicketsService) */
  @ApiPropertyOptional({ description: 'ملاحظة داخلية للأدمن بس — مش متاح للطالب' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean
}
