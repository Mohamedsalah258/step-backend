import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class RejectOrderDto {
  @ApiProperty({ description: 'سبب الرفض — بيتعرض للطالب' })
  @IsString()
  @IsNotEmpty()
  reason: string
}
