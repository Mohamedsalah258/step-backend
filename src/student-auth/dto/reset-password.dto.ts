import { ApiProperty } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty({ description: 'التوكن المؤقت اللي رجع من verify-otp' })
  @IsString()
  resetToken: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string
}
