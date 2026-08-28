import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Notification } from '../database/entities/notification.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { PaginatedResult } from '../common/paginated-result'
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
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
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
