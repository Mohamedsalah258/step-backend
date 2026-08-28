import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString, IsUUID } from 'class-validator'

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID()
  courseId: string

  @ApiProperty()
  @IsUUID()
  paymentMethodId: string

  @ApiProperty({ description: 'الرقم المرجعي لعملية التحويل' })
  @IsString()
  @IsNotEmpty()
  referenceNumber: string

  @ApiProperty({ description: 'fileId بتاع إيصال التحويل (شوف POST /uploads/student)' })
  @IsUUID()
  receiptFileId: string
}
