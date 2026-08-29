import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator'

export class RegisterStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phone: string

  @ApiProperty()
  @IsUUID()
  universityId: string

  @ApiProperty()
  @IsUUID()
  collegeId: string

  @ApiProperty()
  @IsUUID()
  specializationId: string

  @ApiProperty()
  @IsUUID()
  stageId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  termId?: string

  @ApiProperty({ description: 'ID دائم بيتولّد على جهاز الطالب — بيتربط بالحساب فورًا' })
  @IsString()
  @IsNotEmpty()
  deviceIdentifier: string

  @ApiPropertyOptional({ description: 'اسم/موديل الجهاز — للعرض في لوحة الأدمن بس' })
  @IsOptional()
  @IsString()
  deviceModel?: string
}
