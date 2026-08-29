import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Notification } from '../database/entities/notification.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { NotificationBatch } from '../database/entities/notification-batch.entity'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { Course } from '../database/entities/course.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import { ActionType } from '../common/action-catalog'
import type { JwtPayload } from '../auth/jwt.strategy'
import { PaginatedResult } from '../common/paginated-result'
import { SendCustomNotificationDto } from './dto/send-custom-notification.dto'
import { getFirebaseMessaging } from './firebase-admin.util'

const PUSH_BATCH_SIZE = 500
const UNIQUE_VIOLATION = '23505'

interface AcademicMatch {
  collegeId: string
  specializationId: string
  stageId: string
  termId: string
}

interface PushRecipient {
  studentId: string
  token: string
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private notificationsRepo: Repository<Notification>,
    @InjectRepository(NotificationBatch) private batchesRepo: Repository<NotificationBatch>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(Stage) private stagesRepo: Repository<Stage>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
    @InjectRepository(PurchaseRequest) private purchaseRequestsRepo: Repository<PurchaseRequest>,
  ) {}

  async registerPushToken(studentId: string, fcmToken: string): Promise<void> {
    await this.studentsRepo.update(studentId, { fcmToken })
  }

  /** إشعار لطالب واحد — best effort، أي فشل هنا مايوصلش لل-caller خالص */
  async notifyStudent(
    studentId: string,
    type: NotificationType,
    sourceKey: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const student = await this.studentsRepo.findOne({
        where: { id: studentId },
        select: ['id', 'fcmToken'],
      })
      if (!student) return

      await this.notificationsRepo.save(
        this.notificationsRepo.create({ studentId, type, sourceKey, title, body, data: data ?? null }),
      )

      if (student.fcmToken) {
        await this.sendPush([{ studentId, token: student.fcmToken }], title, body, data)
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) return
      // eslint-disable-next-line no-console
      console.error('[Notifications] فشل notifyStudent — تجاهل، مش لازم يكسر العملية الأصلية', error)
    }
  }

  /** كورس جديد اتنشر — كل الطلاب النشطين المطابقين لنفس الهيكل الأكاديمي بالظبط */
  async notifyStudentsMatchingAcademics(
    match: AcademicMatch,
    type: NotificationType,
    sourceKey: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const students = await this.studentsRepo.find({
        where: {
          status: StudentStatus.ACTIVE,
          collegeId: match.collegeId,
          specializationId: match.specializationId,
          stageId: match.stageId,
          termId: match.termId,
        },
        select: ['id', 'fcmToken'],
      })
      await this.bulkNotifyAndPush(students, type, sourceKey, title, body, data)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Notifications] فشل notifyStudentsMatchingAcademics — تجاهل', error)
    }
  }

  /** محتوى جديد اتضاف لكورس — كل الطلاب المشتركين فيه فعليًا (اشتراك نشط) */
  async notifyEnrolledStudents(
    courseId: string,
    type: NotificationType,
    sourceKey: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    try {
      const subs = await this.subscriptionsRepo.find({
        where: { courseId, status: SubscriptionStatus.ACTIVE },
        select: ['studentId'],
      })
      const studentIds = [...new Set(subs.map((s) => s.studentId))]
      if (studentIds.length === 0) return

      const students = await this.studentsRepo.find({
        where: { id: In(studentIds), status: StudentStatus.ACTIVE },
        select: ['id', 'fcmToken'],
      })
      await this.bulkNotifyAndPush(students, type, sourceKey, title, body, data)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[Notifications] فشل notifyEnrolledStudents — تجاهل', error)
    }
  }

  async list(studentId: string, page: number, limit: number): Promise<PaginatedResult<Notification>> {
    const [data, total] = await this.notificationsRepo.findAndCount({
      where: { studentId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } }
  }

  async unreadCount(studentId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepo.count({ where: { studentId, isRead: false } })
    return { count }
  }

  async markRead(studentId: string, id: string): Promise<{ ok: true }> {
    const notification = await this.notificationsRepo.findOne({ where: { id } })
    if (!notification || notification.studentId !== studentId) {
      throw new NotFoundException('الإشعار غير موجود')
    }
    if (!notification.isRead) {
      await this.notificationsRepo.update(id, { isRead: true })
    }
    return { ok: true }
  }

  async markAllRead(studentId: string): Promise<{ ok: true }> {
    await this.notificationsRepo.update({ studentId, isRead: false }, { isRead: true })
    return { ok: true }
  }

  /** معاينة عدد ونص المستهدفين قبل الإرسال — نفس منطق التصفية بتاع الإرسال الفعلي */
  async previewAudience(
    courseId?: string,
    stageId?: string,
    termId?: string,
  ): Promise<{ count: number; label: string }> {
    const { students, label } = await this.resolveAudience(courseId, stageId, termId)
    return { count: students.length, label }
  }

  /**
   * إرسال إشعار مخصّص من الأدمن (شاشة "الإشعارات") لمجموعة طلاب مستهدفة.
   * على عكس notify* التانيين، ده فعل الأدمن الأساسي مش side-effect — أي خطأ
   * هنا لازم يوصل للـ caller عادي (مافيش swallow) عشان الأدمن يعرف إن
   * الإرسال فشل فعلاً.
   */
  async sendCustomNotification(
    dto: SendCustomNotificationDto,
    admin: JwtPayload,
  ): Promise<{ ok: true; id: string; recipientCount: number }> {
    const { students, label } = await this.resolveAudience(dto.courseId, dto.stageId, dto.termId)

    const batch = await this.batchesRepo.save(
      this.batchesRepo.create({
        title: dto.title,
        body: dto.body,
        type: dto.type ?? 'عام',
        courseId: dto.courseId ?? null,
        stageId: dto.stageId ?? null,
        termId: dto.termId ?? null,
        audienceLabel: label,
        recipientCount: students.length,
        sentByAdminName: admin.name,
        sentByAdminId: admin.sub,
      }),
    )

    await this.bulkNotifyAndPush(
      students,
      NotificationType.ADMIN_CUSTOM,
      `admin-notification:${batch.id}`,
      dto.title,
      dto.body,
    )

    await this.activityRepo.save(
      this.activityRepo.create({
        actionType: ActionType.SEND_NOTIFICATION,
        studentId: null,
        studentNameSnapshot: null,
        courseNameSnapshot: null,
        details: `${dto.title} — ${label}`,
        adminId: admin.sub,
        adminName: admin.name,
      }),
    )

    return { ok: true, id: batch.id, recipientCount: students.length }
  }

  /** سجل الإشعارات المرسلة سابقًا — يغذي جدول "سجل الإشعارات المرسلة سابقاً" */
  async listBatches(page: number, limit: number): Promise<PaginatedResult<unknown>> {
    const [rows, total] = await this.batchesRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return {
      data: rows.map((b) => ({
        id: b.id,
        title: b.title,
        type: b.type,
        audience: b.audienceLabel,
        date: b.createdAt.toISOString(),
        status: b.status,
      })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  }

  /**
   * لوحة "تنبيهات الإدارة والسيستم" — حاجات محتاجة انتباه الأدمن نفسه (وارد)،
   * عكس سجل الإشعارات فوق (صادر — اللي الأدمن بعته للطلاب). حاليًا طلبات
   * الشراء المعلّقة بس (PENDING) — مفيش مفهوم "طلب ريست جهاز معلّق" في
   * النظام لسه (الريست فعل فوري بيعمله الأدمن مباشرة، شوف README).
   */
  async adminAlerts(limit: number): Promise<unknown[]> {
    const rows = await this.purchaseRequestsRepo.find({
      where: { status: PurchaseRequestStatus.PENDING },
      relations: ['student', 'course', 'course.term'],
      order: { createdAt: 'DESC' },
      take: limit,
    })

    return rows.map((r) => ({
      id: r.id,
      time: r.createdAt.toISOString(),
      title: `طلب شراء جديد من ${r.student.name}`,
      desc: r.course.term ? `${r.course.name} — ${r.course.term.name}` : r.course.name,
      tone: 'danger',
    }))
  }

  /** نفس منطق التصفية لكل من المعاينة والإرسال الفعلي — بيرجع الطلاب المستهدفين + نص العرض */
  private async resolveAudience(
    courseId?: string,
    stageId?: string,
    termId?: string,
  ): Promise<{ students: Pick<Student, 'id' | 'fcmToken'>[]; label: string }> {
    let studentIdFilter: string[] | undefined
    if (courseId) {
      const subs = await this.subscriptionsRepo.find({
        where: { courseId, status: SubscriptionStatus.ACTIVE },
        select: ['studentId'],
      })
      studentIdFilter = [...new Set(subs.map((s) => s.studentId))]
      if (studentIdFilter.length === 0) {
        return { students: [], label: await this.buildAudienceLabel(0, courseId, stageId, termId) }
      }
    }

    const students = await this.studentsRepo.find({
      where: {
        status: StudentStatus.ACTIVE,
        ...(studentIdFilter ? { id: In(studentIdFilter) } : {}),
        ...(stageId ? { stageId } : {}),
        ...(termId ? { termId } : {}),
      },
      select: ['id', 'fcmToken'],
    })

    return { students, label: await this.buildAudienceLabel(students.length, courseId, stageId, termId) }
  }

  /** نص عرض جاهز زي "كل الطلاب (1,247 طالب)" أو "طلاب: كورس X — مرحلة Y (40 طالب)" */
  private async buildAudienceLabel(
    count: number,
    courseId?: string,
    stageId?: string,
    termId?: string,
  ): Promise<string> {
    if (!courseId && !stageId && !termId) {
      return `كل الطلاب (${count} طالب)`
    }

    const [course, stage, term] = await Promise.all([
      courseId ? this.coursesRepo.findOne({ where: { id: courseId }, select: ['name'] }) : null,
      stageId ? this.stagesRepo.findOne({ where: { id: stageId }, select: ['name'] }) : null,
      termId ? this.termsRepo.findOne({ where: { id: termId }, select: ['name'] }) : null,
    ])

    const parts = [
      course && `كورس ${course.name}`,
      stage && `مرحلة ${stage.name}`,
      term && `ترم ${term.name}`,
    ].filter((p): p is string => Boolean(p))

    return `طلاب: ${parts.join(' — ')} (${count} طالب)`
  }

  /** إدراج bulk (ON CONFLICT DO NOTHING على sourceKey+type+studentId) + push
   * لمين عنده fcmToken من نفس المجموعة */
  private async bulkNotifyAndPush(
    students: Pick<Student, 'id' | 'fcmToken'>[],
    type: NotificationType,
    sourceKey: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (students.length === 0) return

    await this.notificationsRepo
      .createQueryBuilder()
      .insert()
      .into(Notification)
      .values(
        students.map((s) => ({
          studentId: s.id,
          type,
          sourceKey,
          title,
          body,
          data: data ?? null,
        })),
      )
      .orIgnore()
      .execute()

    const recipients: PushRecipient[] = students
      .filter((s): s is Pick<Student, 'id' | 'fcmToken'> & { fcmToken: string } => Boolean(s.fcmToken))
      .map((s) => ({ studentId: s.id, token: s.fcmToken }))

    if (recipients.length > 0) {
      await this.sendPush(recipients, title, body, data)
    }
  }

  /** بيبعت push حقيقي لو Firebase متبني، وإلا no-op بأمان. بيقسّم على 500
   * توكن (حد sendEachForMulticast)، وبيصفّي أي توكن رجع invalid من صاحبه. */
  private async sendPush(
    recipients: PushRecipient[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const messaging = getFirebaseMessaging()
    if (!messaging) return

    for (let i = 0; i < recipients.length; i += PUSH_BATCH_SIZE) {
      const chunk = recipients.slice(i, i + PUSH_BATCH_SIZE)
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: chunk.map((r) => r.token),
          notification: { title, body },
          data,
        })

        const invalidStudentIds: string[] = []
        response.responses.forEach((res, idx) => {
          if (res.success) return
          const code = res.error?.code
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-argument'
          ) {
            invalidStudentIds.push(chunk[idx].studentId)
          }
        })
        if (invalidStudentIds.length > 0) {
          await this.studentsRepo.update({ id: In(invalidStudentIds) }, { fcmToken: null })
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Notifications] فشل إرسال push batch — تجاهل', error)
      }
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    const err = error as { code?: string; driverError?: { code?: string } }
    return err?.code === UNIQUE_VIOLATION || err?.driverError?.code === UNIQUE_VIOLATION
  }
}
