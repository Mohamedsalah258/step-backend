import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, Length } from 'class-validator'

export class VerifyOtpDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty({ description: 'الكود المكوّن من ٤ أرقام اللي اتبعت بالإيميل' })
  @IsString()
  @Length(4, 4)
  otp: string
}
