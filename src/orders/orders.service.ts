import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { Course } from '../database/entities/course.entity'
import { CourseStatus } from '../database/entities/course-status.enum'
import { PaymentMethod } from '../database/entities/payment-method.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { PaginatedResult } from '../common/paginated-result'
import { ActionType } from '../common/action-catalog'
import { UploadsService } from '../uploads/uploads.service'
import { NotificationsService } from '../notifications/notifications.service'
import type { JwtPayload } from '../auth/jwt.strategy'
import { ListOrdersQueryDto, OrdersTab } from './dto/list-orders-query.dto'
import { RejectOrderDto } from './dto/reject-order.dto'
import { CreateOrderDto } from './dto/create-order.dto'

const STATUS_AR: Record<PurchaseRequestStatus, string> = {
  [PurchaseRequestStatus.PENDING]: 'قيد المراجعة',
  [PurchaseRequestStatus.APPROVED]: 'مقبول',
  [PurchaseRequestStatus.REJECTED]: 'مرفوض',
}

const TAB_STATUS: Partial<Record<OrdersTab, PurchaseRequestStatus>> = {
  pending: PurchaseRequestStatus.PENDING,
  approved: PurchaseRequestStatus.APPROVED,
  rejected: PurchaseRequestStatus.REJECTED,
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(PurchaseRequest) private ordersRepo: Repository<PurchaseRequest>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(PaymentMethod) private paymentMethodsRepo: Repository<PaymentMethod>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
    private readonly uploadsService: UploadsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /* ======================================================================
   * الجزء ده كله للطالب — تقديم طلب شراء ومتابعة طلباته هو بس (عكس باقي
   * methods الكلاس دي اللي كلها للأدمن بيراجع بيها كل الطلبات).
   * ====================================================================== */

  async createForStudent(dto: CreateOrderDto, studentId: string) {
    const course = await this.coursesRepo.findOne({
      where: { id: dto.courseId, status: CourseStatus.PUBLISHED },
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')
    if (course.isFree) {
      throw new BadRequestException('الكورس ده مجاني — استخدم POST /student/courses/:id/enroll')
    }

    const paymentMethod = await this.paymentMethodsRepo.findOne({
      where: { id: dto.paymentMethodId, isActive: true },
    })
    if (!paymentMethod) throw new NotFoundException('طريقة الدفع غير موجودة')

    // بيتأكد إن الملف فعلاً موجود قبل ما يربطه — ما يمنعش رفع ملف مالوش
    // علاقة بالإيصال، بس على الأقل يمنع fileId وهمي/مكتوب غلط.
    await this.uploadsService.mustFind(dto.receiptFileId)

    const alreadySubscribed = await this.subscriptionsRepo.findOne({
      where: [
        { studentId, courseId: course.id, status: SubscriptionStatus.ACTIVE },
        { studentId, courseName: course.name, status: SubscriptionStatus.ACTIVE },
      ],
    })
    if (alreadySubscribed) throw new BadRequestException('انت مشترك في الكورس ده بالفعل')

    const pendingExisting = await this.ordersRepo.findOne({
      where: { studentId, courseId: course.id, status: PurchaseRequestStatus.PENDING },
    })
    if (pendingExisting) {
      throw new BadRequestException('عندك طلب شراء لنفس الكورس قيد المراجعة بالفعل')
    }

    const duplicateReference = await this.ordersRepo.findOne({
      where: { referenceNumber: dto.referenceNumber },
    })
    if (duplicateReference) throw new BadRequestException('الرقم المرجعي ده مستخدم قبل كده')

    const saved = await this.ordersRepo.save(
      this.ordersRepo.create({
        studentId,
        courseId: course.id,
        paymentMethodId: paymentMethod.id,
        amount: course.price,
        referenceNumber: dto.referenceNumber,
        receiptFileId: dto.receiptFileId,
        status: PurchaseRequestStatus.PENDING,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async listMine(studentId: string) {
    const rows = await this.ordersRepo.find({
      where: { studentId },
      relations: ['course', 'paymentMethod'],
      order: { createdAt: 'DESC' },
    })
    return rows.map((o) => ({
      id: o.id,
      course: { id: o.course.id, name: o.course.name },
      amount: o.amount,
      method: o.paymentMethod?.name ?? '—',
      referenceNumber: o.referenceNumber,
      status: STATUS_AR[o.status],
      statusRaw: o.status,
      rejectionReason: o.rejectionReason,
      createdAt: o.createdAt.toISOString(),
    }))
  }

  async getMineDetail(id: string, studentId: string) {
    const order = await this.ordersRepo.findOne({
      where: { id, studentId },
      relations: ['course', 'paymentMethod'],
    })
    if (!order) throw new NotFoundException('الطلب غير موجود')
    return {
      id: order.id,
      course: { id: order.course.id, name: order.course.name },
      amount: order.amount,
      paymentMethodName: order.paymentMethod?.name ?? '—',
      referenceNumber: order.referenceNumber,
      receiptFileId: order.receiptFileId,
      status: STATUS_AR[order.status],
      statusRaw: order.status,
      rejectionReason: order.rejectionReason,
      reviewedAt: order.reviewedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    }
  }

  async list(query: ListOrdersQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const qb = this.ordersRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.student', 'student')
      .leftJoinAndSelect('o.course', 'course')
      .leftJoinAndSelect('o.paymentMethod', 'pm')

    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('student.name ILIKE :q', { q: `%${query.q}%` }).orWhere(
            'o.referenceNumber ILIKE :q',
            { q: `%${query.q}%` },
          )
        }),
      )
    }
    const status = query.tab ? TAB_STATUS[query.tab] : undefined
    if (status) qb.andWhere('o.status = :status', { status })
    // ⚠️ لازم DATE(...) مش o."createdAt"::date — الـ cast بـ `::date` بيتصادم
    // مع regex استبدال البارامترات بتاع TypeORM (":date" بتتطابق جوّه "::date"
    // نفسها) وبيطلع SQL تالف. شوف نفس الملاحظة في activity-log.service.ts.
    if (query.date) qb.andWhere('DATE(o."createdAt") = :date', { date: query.date })
    if (query.courseId) qb.andWhere('o."courseId" = :courseId', { courseId: query.courseId })
    if (query.universityId) {
      qb.andWhere('course."universityId" = :universityId', { universityId: query.universityId })
    }
    if (query.collegeId) {
      qb.andWhere('course."collegeId" = :collegeId', { collegeId: query.collegeId })
    }
    if (query.specializationId) {
      qb.andWhere('course."specializationId" = :specializationId', {
        specializationId: query.specializationId,
      })
    }

    const total = await qb.getCount()
    const rows = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const data = rows.map((o, i) => ({
      id: o.id,
      index: String((page - 1) * limit + i + 1),
      student: o.student.name,
      course: o.course.name,
      price: o.amount,
      method: o.paymentMethod?.name ?? '—',
      reference: o.referenceNumber,
      date: o.createdAt.toISOString(),
      status: STATUS_AR[o.status],
      statusRaw: o.status,
    }))

    const [all, pending, approved, rejected] = await Promise.all([
      this.ordersRepo.count(),
      this.ordersRepo.count({ where: { status: PurchaseRequestStatus.PENDING } }),
      this.ordersRepo.count({ where: { status: PurchaseRequestStatus.APPROVED } }),
      this.ordersRepo.count({ where: { status: PurchaseRequestStatus.REJECTED } }),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        tabs: { all, pending, approved, rejected },
      },
    }
  }

  async getDetail(id: string) {
    const order = await this.mustFind(id)
    return {
      id: order.id,
      status: STATUS_AR[order.status],
      statusRaw: order.status,
      student: {
        id: order.student.id,
        name: order.student.name,
        phone: order.student.phone,
        email: order.student.email,
      },
      course: { id: order.course.id, name: order.course.name },
      amount: order.amount,
      paymentMethodName: order.paymentMethod?.name ?? '—',
      referenceNumber: order.referenceNumber,
      receiptFileId: order.receiptFileId,
      rejectionReason: order.rejectionReason,
      reviewedByAdminName: order.reviewedByAdminName,
      reviewedAt: order.reviewedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    }
  }

  async approve(id: string, admin: JwtPayload) {
    const order = await this.mustFind(id)
    if (order.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('الطلب ده اتراجع قبل كده')
    }

    order.status = PurchaseRequestStatus.APPROVED
    order.reviewedByAdminId = admin.sub
    order.reviewedByAdminName = admin.name
    order.reviewedAt = new Date()
    await this.ordersRepo.save(order)

    await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        studentId: order.studentId,
        courseId: order.courseId,
        courseName: order.course.name,
        collegeName: order.course.college?.name ?? '—',
        price: order.amount,
        status: SubscriptionStatus.ACTIVE,
      }),
    )

    await this.logActivity(ActionType.APPROVE_ORDER, order)

    await this.notificationsService.notifyStudent(
      order.studentId,
      NotificationType.ORDER_APPROVED,
      `order:${order.id}:approved`,
      'تم قبول طلبك',
      `تم تفعيل اشتراكك في "${order.course.name}"`,
      { courseId: order.courseId },
    )

    return { ok: true }
  }

  async reject(id: string, dto: RejectOrderDto, admin: JwtPayload) {
    const order = await this.mustFind(id)
    if (order.status !== PurchaseRequestStatus.PENDING) {
      throw new BadRequestException('الطلب ده اتراجع قبل كده')
    }

    order.status = PurchaseRequestStatus.REJECTED
    order.rejectionReason = dto.reason
    order.reviewedByAdminId = admin.sub
    order.reviewedByAdminName = admin.name
    order.reviewedAt = new Date()
    await this.ordersRepo.save(order)

    await this.logActivity(ActionType.REJECT_ORDER, order, dto.reason)

    await this.notificationsService.notifyStudent(
      order.studentId,
      NotificationType.ORDER_REJECTED,
      `order:${order.id}:rejected`,
      'تم رفض طلبك',
      `تم رفض طلب الاشتراك في "${order.course.name}" — ${dto.reason}`,
      { courseId: order.courseId },
    )

    return { ok: true }
  }

  private async logActivity(
    actionType: ActionType,
    order: PurchaseRequest,
    details?: string,
  ): Promise<void> {
    await this.activityRepo.save(
      this.activityRepo.create({
        actionType,
        studentId: order.studentId,
        studentNameSnapshot: order.student.name,
        courseNameSnapshot: order.course.name,
        details: details ?? null,
        adminId: order.reviewedByAdminId,
        adminName: order.reviewedByAdminName ?? 'الإدارة',
      }),
    )
  }

  private async mustFind(id: string): Promise<PurchaseRequest> {
    const order = await this.ordersRepo.findOne({
      where: { id },
      relations: ['student', 'course', 'course.college', 'paymentMethod'],
    })
    if (!order) throw new NotFoundException('الطلب غير موجود')
    return order
  }
}
