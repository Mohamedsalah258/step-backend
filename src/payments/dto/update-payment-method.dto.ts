import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { PaymentMethodType } from '../../database/entities/payment-method-type.enum'

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @ApiPropertyOptional({ enum: PaymentMethodType })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  type?: PaymentMethodType

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accountNumber?: string

  @ApiPropertyOptional({ description: 'بنك بس' })
  @IsOptional()
  @IsString()
  bankName?: string

  @ApiPropertyOptional({ description: 'بنك بس' })
  @IsOptional()
  @IsString()
  holderName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instructions?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
