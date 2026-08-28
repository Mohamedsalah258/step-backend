import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'

export class OpenCourseDto {
  @ApiProperty({ description: 'اسم الكورس المطلوب فتحه للطالب' })
  @IsString()
  @IsNotEmpty()
  courseName: string

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  collegeName?: string

  @ApiProperty({ required: false, description: 'اتركه فاضي لو الفتح مجاني' })
  @IsOptional()
  @IsNumber()
  price?: number
}
