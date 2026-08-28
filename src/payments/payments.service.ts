import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PaymentMethod } from '../database/entities/payment-method.entity'
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto'
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto'

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentMethod) private methodsRepo: Repository<PaymentMethod>,
  ) {}

  async list() {
    const rows = await this.methodsRepo.find({ order: { createdAt: 'ASC' } })
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber,
      bankName: m.bankName,
      holderName: m.holderName,
      instructions: m.instructions,
      isActive: m.isActive,
    }))
  }

  /** طرق الدفع النشطة بس — تطبيق الطالب يعرضها وقت الشراء عشان يعرف يحوّل فين */
  async listActive() {
    const rows = await this.methodsRepo.find({
      where: { isActive: true },
      order: { createdAt: 'ASC' },
    })
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      type: m.type,
      accountNumber: m.accountNumber,
      bankName: m.bankName,
      holderName: m.holderName,
      instructions: m.instructions,
    }))
  }

  async create(dto: CreatePaymentMethodDto) {
    const saved = await this.methodsRepo.save(
      this.methodsRepo.create({
        name: dto.name,
        type: dto.type,
        accountNumber: dto.accountNumber ?? null,
        bankName: dto.bankName ?? null,
        holderName: dto.holderName ?? null,
        instructions: dto.instructions ?? null,
        isActive: dto.isActive ?? true,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async update(id: string, dto: UpdatePaymentMethodDto) {
    await this.mustFind(id)
    await this.methodsRepo.update(id, dto)
    return { ok: true }
  }

  async toggle(id: string) {
    const method = await this.mustFind(id)
    method.isActive = !method.isActive
    await this.methodsRepo.save(method)
    return { ok: true, isActive: method.isActive }
  }

  async delete(id: string) {
    await this.mustFind(id)
    await this.methodsRepo.delete(id)
    return { ok: true }
  }

  private async mustFind(id: string): Promise<PaymentMethod> {
    const method = await this.methodsRepo.findOne({ where: { id } })
    if (!method) throw new NotFoundException('طريقة الدفع غير موجودة')
    return method
  }
}
