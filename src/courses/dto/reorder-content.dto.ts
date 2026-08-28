import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsUUID } from 'class-validator'

/** ids بترتيب العرض الجديد المطلوب — الأول index=0 وهكذا */
export class ReorderContentDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[]
}
