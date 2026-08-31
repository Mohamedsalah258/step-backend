import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContactSupportMessage } from '../database/entities/contact-support-message.entity'
import { PaginatedResult } from '../common/paginated-result'
import { MailService } from '../mail/mail.service'
import type { JwtPayload } from '../auth/jwt.strategy'
import { CreateContactSupportMessageDto } from './dto/create-contact-support-message.dto'
import { ListContactSupportQueryDto } from './dto/list-contact-support-query.dto'
import { ReplyContactSupportMessageDto } from './dto/reply-contact-support-message.dto'

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

  /** رد الأدمن على رسالة زائر من الداشبورد — بيتبعت كإيميل حقيقي على طول
   * (مفيش محادثة داخل التطبيق زي SupportTicket)، وبيتسجل وقت واسم الأدمن. */
  async reply(id: string, dto: ReplyContactSupportMessageDto, admin: JwtPayload): Promise<{ ok: true }> {
    const msg = await this.repo.findOne({ where: { id } })
    if (!msg) throw new NotFoundException('الرسالة غير موجودة')

    await this.mailService.sendContactSupportReply(msg.emailForReply, msg.name, msg.message, dto.message)

    await this.repo.update(id, {
      replyMessage: dto.message,
      repliedAt: new Date(),
      repliedByAdminName: admin.name,
    })

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
