import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'
import { PaymentMethodType } from './payment-method-type.enum'

/** يقابل PaymentMethod / MethodCard في data/payments.ts */
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: PaymentMethodType })
  type: PaymentMethodType

  /** رقم المحفظة (WALLET) أو رقم الحساب البنكي (BANK) */
  @Column({ nullable: true })
  accountNumber: string | null

  /** بنك بس */
  @Column({ nullable: true })
  bankName: string | null

  /** بنك بس */
  @Column({ nullable: true })
  holderName: string | null

  @Column({ type: 'text', nullable: true })
  instructions: string | null

  @Column({ default: true })
  isActive: boolean

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date
}
