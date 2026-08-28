import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class LoginStudentDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  password: string

  @ApiProperty({ description: 'نفس الـ ID اللي اتبعت وقت التسجيل' })
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceModel?: string
}
