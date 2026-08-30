import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContactSupportMessage } from '../database/entities/contact-support-message.entity'
import { PaginatedResult } from '../common/paginated-result'
import { MailService } from '../mail/mail.service'
import { CreateContactSupportMessageDto } from './dto/create-contact-support-message.dto'
import { ListContactSupportQueryDto } from './dto/list-contact-support-query.dto'

@Injectable()
export class ContactSupportService {
  private readonly logger = new Logger(ContactSupportService.name)

  constructor(
    @InjectRepository(ContactSupportMessage) private repo: Repository<ContactSupportMessage>,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateContactSupportMessageDto): Promise<{ ok: true }> {
    await this.repo.save(
      this.repo.create({
        name: dto.name ?? null,
        emailForReply: dto.emailForReply,
        message: dto.message,
      }),
    )

    // Best-effort — الرسالة اتسجّلت في الداتابيز أهم حاجة، فشل الإيميل مايوقفش الطلب
    try {
      await this.mailService.sendContactSupportNotification(dto.name ?? null, dto.emailForReply, dto.message)
    } catch (err) {
      this.logger.error('فشل إرسال إشعار تواصل مع الدعم بالإيميل', err instanceof Error ? err.stack : err)
    }

    return { ok: true }
  }

  async list(query: ListContactSupportQueryDto): Promise<PaginatedResult<ContactSupportMessage>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20

    const [rows, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      data: rows,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  }
}
