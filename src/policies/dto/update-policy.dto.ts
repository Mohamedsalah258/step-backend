import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdatePolicyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  heading: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string
}
