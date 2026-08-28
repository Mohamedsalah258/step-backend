import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateMaintenanceMessageDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string
}
