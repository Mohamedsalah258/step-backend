import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsString, MinLength } from 'class-validator'

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string

  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string

  @ApiProperty({
    description:
      'كود دعوة سري (ADMIN_INVITE_CODE في .env) — بيمنع أي حد من برّه يعمل حساب أدمن لنفسه.',
  })
  @IsString()
  inviteCode!: string
}
