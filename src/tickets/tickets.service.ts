import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { SupportTicket } from '../database/entities/support-ticket.entity'
import { SupportTicketMessage } from '../database/entities/support-ticket-message.entity'
import { SupportTicketCategory } from '../database/entities/support-ticket-category.entity'
import { SupportTicketStatus } from '../database/entities/support-ticket-status.enum'
import { SupportTicketPriority } from '../database/entities/support-ticket-priority.enum'
import { SupportTicketSenderType } from '../database/entities/support-ticket-sender-type.enum'
import { NotificationType } from '../database/entities/notification-type.enum'
import { Admin } from '../database/entities/admin.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ActionType } from '../common/action-catalog'
import { PaginatedResult } from '../common/paginated-result'
import { UploadsService } from '../uploads/uploads.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { JwtPayload } from '../auth/jwt.strategy'
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto'
import { AssignTicketDto } from './dto/assign-ticket.dto'
import { ListTicketsQueryDto, TicketsTab } from './dto/list-tickets-query.dto'
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto'
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto'

const STATUS_AR: Record<SupportTicketStatus, string> = {
  [SupportTicketStatus.OPEN]: 'مفتوحة',
  [SupportTicketStatus.IN_PROGRESS]: 'قيد المعالجة',
  [SupportTicketStatus.RESOLVED]: 'تم الحل',
  [SupportTicketStatus.CLOSED]: 'مغلقة',
  [SupportTicketStatus.CANCELLED]: 'ملغاة',
}

/** خريطة الانتقالات المسموحة — أي محاولة تحويل مش موجودة هنا بترفض */
const ALLOWED_TRANSITIONS: Record<SupportTicketStatus, SupportTicketStatus[]> = {
  [SupportTicketStatus.OPEN]: [SupportTicketStatus.IN_PROGRESS, SupportTicketStatus.CANCELLED],
  [SupportTicketStatus.IN_PROGRESS]: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CANCELLED],
  [SupportTicketStatus.RESOLVED]: [SupportTicketStatus.CLOSED, SupportTicketStatus.IN_PROGRESS],
  [SupportTicketStatus.CLOSED]: [],
  [SupportTicketStatus.CANCELLED]: [],
}

const TAB_STATUS: Partial<Record<TicketsTab, SupportTicketStatus>> = {
  open: SupportTicketStatus.OPEN,
  in_progress: SupportTicketStatus.IN_PROGRESS,
  resolved: SupportTicketStatus.RESOLVED,
  closed: SupportTicketStatus.CLOSED,
  cancelled: SupportTicketStatus.CANCELLED,
}

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(SupportTicket) private ticketsRepo: Repository<SupportTicket>,
    @InjectRepository(SupportTicketMessage) private messagesRepo: Repository<SupportTicketMessage>,
    @InjectRepository(SupportTicketCategory) private categoriesRepo: Repository<SupportTicketCategory>,
    @InjectRepository(Admin) private adminsRepo: Repository<Admin>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
    private readonly uploadsService: UploadsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /* ======================================================================
   * الطالب — فتح تذاكره ومتابعتها بس (الشرط: صاحب التذكرة، شوف mustFindOwned)
   * ====================================================================== */

  async createForStudent(
    dto: CreateSupportTicketDto,
    studentId: string,
    studentName: string,
  ): Promise<{ ok: true; id: string }> {
    if (dto.categoryId) await this.mustCategoryExist(dto.categoryId)
    if (dto.attachmentFileId) await this.uploadsService.mustFind(dto.attachmentFileId)

    const ticket = await this.ticketsRepo.save(
      this.ticketsRepo.create({
        studentId,
        categoryId: dto.categoryId ?? null,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? SupportTicketPriority.MEDIUM,
        status: SupportTicketStatus.OPEN,
      }),
    )

    await this.messagesRepo.save(
      this.messagesRepo.create({
        ticketId: ticket.id,
        senderType: SupportTicketSenderType.STUDENT,
        senderName: studentName,
        senderStudentId: studentId,
        message: dto.description,
        attachmentFileId: dto.attachmentFileId ?? null,
      }),
    )

    return { ok: true, id: ticket.id }
  }

  async listMine(studentId: string) {
    const rows = await this.ticketsRepo.find({
      where: { studentId },
      relations: ['category'],
      order: { updatedAt: 'DESC' },
    })
    return rows.map((t) => this.toStudentSummary(t))
  }

  async getMineDetail(id: string, studentId: string) {
    const ticket = await this.mustFindOwned(id, studentId)
    const messages = await this.messagesRepo.find({
      where: { ticketId: id, isInternal: false },
      order: { createdAt: 'ASC' },
    })
    return {
      ...this.toStudentSummary(ticket),
      messages: messages.map((m) => this.toMessageDto(m)),
    }
  }

  async addMessageAsStudent(id: string, dto: CreateTicketMessageDto, studentId: string, studentName: string) {
    await this.mustFindOwned(id, studentId)
    if (dto.attachmentFileId) await this.uploadsService.mustFind(dto.attachmentFileId)

    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        ticketId: id,
        senderType: SupportTicketSenderType.STUDENT,
        senderName: studentName,
        senderStudentId: studentId,
        message: dto.message,
        attachmentFileId: dto.attachmentFileId ?? null,
        // isInternal مش متاح للطالب، بيتجاهل أي قيمة يبعتها
        isInternal: false,
      }),
    )
    // بيرفع التذكرة لأول القايمة عند الأدمن (مرتبة بـ updatedAt)
    await this.ticketsRepo.update(id, { updatedAt: new Date() })
    return { ok: true, id: message.id }
  }

  async listCategoriesForStudent() {
    const rows = await this.categoriesRepo.find({
      where: { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    })
    return rows.map((c) => ({ id: c.id, name: c.name }))
  }

  /* ======================================================================
   * الأدمن — يشوف ويدير كل التذاكر
   * ====================================================================== */

  async list(query: ListTicketsQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const qb = this.ticketsRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.student', 'student')
      .leftJoinAndSelect('t.category', 'category')

    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('t.subject ILIKE :q', { q: `%${query.q}%` }).orWhere('student.name ILIKE :q', {
            q: `%${query.q}%`,
          })
        }),
      )
    }
    const status = query.tab ? TAB_STATUS[query.tab] : undefined
    if (status) qb.andWhere('t.status = :status', { status })
    if (query.priority) qb.andWhere('t.priority = :priority', { priority: query.priority })
    if (query.categoryId) qb.andWhere('t.categoryId = :categoryId', { categoryId: query.categoryId })
    if (query.assignedAdminId) {
      qb.andWhere('t.assignedAdminId = :assignedAdminId', { assignedAdminId: query.assignedAdminId })
    }

    const total = await qb.getCount()
    const rows = await qb
      .orderBy('t.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const [all, open, inProgress, resolved, closed, cancelled] = await Promise.all([
      this.ticketsRepo.count(),
      this.ticketsRepo.count({ where: { status: SupportTicketStatus.OPEN } }),
      this.ticketsRepo.count({ where: { status: SupportTicketStatus.IN_PROGRESS } }),
      this.ticketsRepo.count({ where: { status: SupportTicketStatus.RESOLVED } }),
      this.ticketsRepo.count({ where: { status: SupportTicketStatus.CLOSED } }),
      this.ticketsRepo.count({ where: { status: SupportTicketStatus.CANCELLED } }),
    ])

    return {
      data: rows.map((t) => ({
        id: t.id,
        subject: t.subject,
        student: { id: t.student.id, name: t.student.name },
        category: t.category?.name ?? null,
        priority: t.priority,
        status: STATUS_AR[t.status],
        statusRaw: t.status,
        assignedAdminName: t.assignedAdminName,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        tabs: { all, open, inProgress, resolved, closed, cancelled },
      },
    }
  }

  async getDetail(id: string) {
    const ticket = await this.mustFind(id)
    const messages = await this.messagesRepo.find({
      where: { ticketId: id },
      order: { createdAt: 'ASC' },
    })
    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      student: {
        id: ticket.student.id,
        name: ticket.student.name,
        email: ticket.student.email,
        phone: ticket.student.phone,
      },
      category: ticket.category ? { id: ticket.category.id, name: ticket.category.name } : null,
      priority: ticket.priority,
      status: STATUS_AR[ticket.status],
      statusRaw: ticket.status,
      assignedAdminId: ticket.assignedAdminId,
      assignedAdminName: ticket.assignedAdminName,
      resolution: ticket.resolution,
      resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
      closedAt: ticket.closedAt?.toISOString() ?? null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      messages: messages.map((m) => this.toMessageDto(m)),
    }
  }

  async addMessageAsAdmin(id: string, dto: CreateTicketMessageDto, admin: JwtPayload) {
    const ticket = await this.mustFind(id)
    if (dto.attachmentFileId) await this.uploadsService.mustFind(dto.attachmentFileId)

    const isInternal = dto.isInternal ?? false

    // أول رد من أدمن على تذكرة مالهاش متكلّف بيتعيّنله تلقائي
    await this.ticketsRepo.update(id, {
      updatedAt: new Date(),
      ...(!ticket.assignedAdminId ? { assignedAdminId: admin.sub, assignedAdminName: admin.name } : {}),
    })

    const message = await this.messagesRepo.save(
      this.messagesRepo.create({
        ticketId: id,
        senderType: SupportTicketSenderType.ADMIN,
        senderName: admin.name,
        senderAdminId: admin.sub,
        message: dto.message,
        attachmentFileId: dto.attachmentFileId ?? null,
        isInternal,
      }),
    )

    if (!isInternal) {
      await this.notificationsService.notifyStudent(
        ticket.studentId,
        NotificationType.TICKET_REPLY,
        `ticket-message:${message.id}`,
        'رد جديد على تذكرة الدعم بتاعتك',
        dto.message.length > 120 ? `${dto.message.slice(0, 120)}…` : dto.message,
        { ticketId: id },
      )
    }

    return { ok: true, id: message.id }
  }

  async assign(id: string, dto: AssignTicketDto, admin: JwtPayload) {
    const ticket = await this.mustFind(id)
    let assignedAdminName: string | null = null
    if (dto.adminId) {
      const target = await this.adminsRepo.findOne({ where: { id: dto.adminId } })
      if (!target) throw new NotFoundException('الأدمن غير موجود')
      assignedAdminName = target.name
    }

    await this.ticketsRepo.update(id, {
      assignedAdminId: dto.adminId ?? null,
      assignedAdminName,
    })

    await this.logActivity(ActionType.ASSIGN_TICKET, ticket, admin, {
      details: assignedAdminName ? `اتعينت لـ ${assignedAdminName}` : 'اتشال التعيين',
    })

    return { ok: true }
  }

  async updateStatus(id: string, dto: UpdateTicketStatusDto, admin: JwtPayload) {
    const ticket = await this.mustFind(id)
    const allowed = ALLOWED_TRANSITIONS[ticket.status]
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `مينفعش تحوّل التذكرة من "${STATUS_AR[ticket.status]}" لـ "${STATUS_AR[dto.status]}"`,
      )
    }

    const resolution = dto.resolution ?? ticket.resolution
    if (dto.status === SupportTicketStatus.RESOLVED && !resolution) {
      throw new BadRequestException('لازم تكتب ملاحظة الحل قبل ما تقفل التذكرة كـ "تم الحل"')
    }

    const now = new Date()
    await this.ticketsRepo.update(id, {
      status: dto.status,
      resolution: resolution ?? null,
      resolvedAt: dto.status === SupportTicketStatus.RESOLVED ? now : ticket.resolvedAt,
      closedAt: dto.status === SupportTicketStatus.CLOSED ? now : ticket.closedAt,
    })

    await this.logActivity(ActionType.TICKET_STATUS_CHANGE, ticket, admin, {
      details: `الحالة اتغيّرت لـ ${STATUS_AR[dto.status]}`,
    })

    if (dto.status === SupportTicketStatus.RESOLVED) {
      await this.notificationsService.notifyStudent(
        ticket.studentId,
        NotificationType.TICKET_STATUS_CHANGED,
        `ticket-resolved:${id}`,
        'تم حل تذكرة الدعم بتاعتك',
        ticket.subject,
        { ticketId: id },
      )
    }

    return { ok: true }
  }

  /* ======================================================================
   * التصنيفات — إدارية بالكامل
   * ====================================================================== */

  async listCategories(includeInactive: boolean) {
    const rows = await this.categoriesRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    })
    return rows.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive, order: c.order }))
  }

  async createCategory(dto: CreateTicketCategoryDto) {
    const saved = await this.categoriesRepo.save(
      this.categoriesRepo.create({ name: dto.name, order: dto.order ?? 0 }),
    )
    return { ok: true, id: saved.id }
  }

  async updateCategory(id: string, dto: UpdateTicketCategoryDto) {
    await this.mustCategoryExist(id)
    await this.categoriesRepo.update(id, dto)
    return { ok: true }
  }

  async deactivateCategory(id: string) {
    await this.mustCategoryExist(id)
    await this.categoriesRepo.update(id, { isActive: false })
    return { ok: true }
  }

  private toStudentSummary(ticket: SupportTicket) {
    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      category: ticket.category?.name ?? null,
      priority: ticket.priority,
      status: STATUS_AR[ticket.status],
      statusRaw: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    }
  }

  private toMessageDto(m: SupportTicketMessage) {
    return {
      id: m.id,
      senderType: m.senderType,
      senderName: m.senderName,
      message: m.message,
      attachmentFileId: m.attachmentFileId,
      isInternal: m.isInternal,
      createdAt: m.createdAt.toISOString(),
    }
  }

  private async mustFind(id: string): Promise<SupportTicket> {
    const ticket = await this.ticketsRepo.findOne({
      where: { id },
      relations: ['student', 'category'],
    })
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة')
    return ticket
  }

  private async mustFindOwned(id: string, studentId: string): Promise<SupportTicket> {
    const ticket = await this.ticketsRepo.findOne({
      where: { id, studentId },
      relations: ['category'],
    })
    if (!ticket) throw new NotFoundException('التذكرة غير موجودة')
    return ticket
  }

  private async mustCategoryExist(id: string): Promise<void> {
    const found = await this.categoriesRepo.findOne({ where: { id } })
    if (!found) throw new NotFoundException('تصنيف التذكرة غير موجود')
  }

  private async logActivity(
    actionType: ActionType,
    ticket: SupportTicket,
    admin: JwtPayload,
    extra: { details?: string },
  ): Promise<void> {
    await this.activityRepo.save(
      this.activityRepo.create({
        actionType,
        studentId: ticket.studentId,
        studentNameSnapshot: ticket.student?.name ?? null,
        adminId: admin.sub,
        adminName: admin.name,
        ...extra,
      }),
    )
  }
}
