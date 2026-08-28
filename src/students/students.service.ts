import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { ResetLog } from '../database/entities/reset-log.entity'
import {
  Subscription,
  SubscriptionStatus,
} from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { ActionType } from '../common/action-catalog'
import { STUDENT_STATUS_AR, SUBSCRIPTION_STATUS_AR } from '../common/action-catalog'
import { PaginatedResult } from '../common/paginated-result'
import type { JwtPayload } from '../auth/jwt.strategy'
import { ProfileLockService } from '../profile-lock/profile-lock.service'
import { NotificationsService } from '../notifications/notifications.service'
import { ListStudentsQueryDto } from './dto/list-students-query.dto'
import { OpenCourseDto } from './dto/open-course.dto'

export type StudentListItem = {
  id: string
  index: string
  name: string
  email: string
  phone: string
  subscriptions: string
  device: string
  status: string
}

const MAX_RESETS_PER_CYCLE = 3
const RESET_CYCLE_DAYS = 30

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(ResetLog) private resetLogsRepo: Repository<ResetLog>,
    @InjectRepository(Subscription)
    private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(ActivityLog)
    private activityRepo: Repository<ActivityLog>,
    private readonly profileLockService: ProfileLockService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** GET /students — بحث حقيقي (name/email) + فلتر تاب + فلتر كورس + صفحات */
  async list(query: ListStudentsQueryDto): Promise<PaginatedResult<StudentListItem>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 8

    const qb = this.studentsRepo
      .createQueryBuilder('student')
      .leftJoin('student.subscriptions', 'sub')
      .distinct(true)

    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('student.name ILIKE :q', { q: `%${query.q}%` }).orWhere(
            'student.email ILIKE :q',
            { q: `%${query.q}%` },
          )
        }),
      )
    }

    if (query.tab === 'active') {
      qb.andWhere('student.status = :status', { status: StudentStatus.ACTIVE })
    } else if (query.tab === 'banned') {
      qb.andWhere('student.status = :status', { status: StudentStatus.BANNED })
    }

    if (query.course) {
      qb.andWhere('sub.courseName ILIKE :course', { course: `%${query.course}%` })
    }

    const total = await qb.getCount()

    const rows = await qb
      .orderBy('student.registeredAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    // عدد الاشتراكات الفعلي لكل طالب (منفصل عن استعلام البحث عشان الـ join
    // بتاع فلتر الكورس ميأثرش على العدّ)
    const data = await Promise.all(
      rows.map(async (s, i) => {
        const subsCount = await this.subscriptionsRepo.count({
          where: { studentId: s.id },
        })
        return {
          id: s.id,
          /** رقم العرض داخل الصفحة الحالية بس — مش عمود مخزّن في الداتابيز */
          index: String((page - 1) * limit + i + 1),
          name: s.name,
          email: s.email,
          phone: s.phone,
          subscriptions: String(subsCount),
          device: s.deviceModel ?? '—',
          status: STUDENT_STATUS_AR[s.status],
        }
      }),
    )

    const [all, active, banned] = await Promise.all([
      this.studentsRepo.count(),
      this.studentsRepo.count({ where: { status: StudentStatus.ACTIVE } }),
      this.studentsRepo.count({ where: { status: StudentStatus.BANNED } }),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        tabs: { all, active, banned },
      },
    }
  }

  async getDetail(id: string) {
    const student = await this.studentsRepo.findOne({ where: { id } })
    if (!student) throw new NotFoundException('الطالب غير موجود')

    const [subscriptions, resetLog] = await Promise.all([
      this.subscriptionsRepo.find({
        where: { studentId: id },
        order: { subscribedAt: 'ASC' },
      }),
      this.resetLogsRepo.find({
        where: { studentId: id },
        order: { createdAt: 'DESC' },
      }),
    ])

    const resetsPercent = Math.min(
      100,
      Math.round((student.resetsUsed / MAX_RESETS_PER_CYCLE) * 100),
    )
    const nextResetAt =
      student.resetsUsed >= MAX_RESETS_PER_CYCLE && student.lastResetAt
        ? new Date(
            student.lastResetAt.getTime() + RESET_CYCLE_DAYS * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null

    const academicEditLocked = await this.profileLockService.isLockedForStudent(student)

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: STUDENT_STATUS_AR[student.status],
      registeredAt: student.registeredAt.toISOString(),
      profileEditUnlocked: student.profileEditUnlocked,
      academicEditLocked,
      device: student.deviceModel
        ? { model: student.deviceModel, identifier: student.deviceIdentifier }
        : null,
      resetsUsed: student.resetsUsed,
      maxResets: MAX_RESETS_PER_CYCLE,
      resetsPercent,
      lastResetAt: student.lastResetAt?.toISOString() ?? null,
      nextResetAt,
      resetLog: resetLog.map((r) => ({
        id: r.id,
        model: r.deviceModel,
        by: r.byAdmin,
        date: r.createdAt.toISOString(),
      })),
      subscriptions: subscriptions.map((s, i) => ({
        id: s.id,
        index: String(i + 1),
        course: s.courseName,
        college: s.collegeName,
        date: s.subscribedAt.toISOString(),
        status: SUBSCRIPTION_STATUS_AR[s.status],
        price: s.price,
      })),
    }
  }

  async ban(id: string, admin: JwtPayload) {
    const student = await this.mustFind(id)
    student.status = StudentStatus.BANNED
    await this.studentsRepo.save(student)
    await this.logActivity(ActionType.BAN_STUDENT, student, admin, {
      details: student.deviceModel ? `الجهاز ${student.deviceModel}` : undefined,
    })

    await this.notificationsService.notifyStudent(
      student.id,
      NotificationType.ACCOUNT_BANNED,
      `student:${student.id}:banned`,
      'تم حظر حسابك',
      'تم حظر حسابك — تواصل مع الدعم لمعرفة التفاصيل',
    )

    return { ok: true }
  }

  async unban(id: string, admin: JwtPayload) {
    const student = await this.mustFind(id)
    student.status = StudentStatus.ACTIVE
    await this.studentsRepo.save(student)
    await this.logActivity(ActionType.UNBAN_STUDENT, student, admin, {})
    return { ok: true }
  }

  /** استثناء يدوي — بيفتح تعديل البيانات الأكاديمية للطالب ده بس، حتى لو
   * القفل العام مفعّل، لحد ما الأدمن يقفله تاني بـ lockProfile. */
  async unlockProfile(id: string, admin: JwtPayload) {
    const student = await this.mustFind(id)
    student.profileEditUnlocked = true
    await this.studentsRepo.save(student)
    await this.logActivity(ActionType.STUDENT_PROFILE_UNLOCKED, student, admin, {})
    return { ok: true }
  }

  async lockProfile(id: string, admin: JwtPayload) {
    const student = await this.mustFind(id)
    student.profileEditUnlocked = false
    await this.studentsRepo.save(student)
    await this.logActivity(ActionType.STUDENT_PROFILE_LOCKED, student, admin, {})
    return { ok: true }
  }

  async deviceReset(id: string, admin: JwtPayload) {
    const student = await this.mustFind(id)
    if (student.resetsUsed >= MAX_RESETS_PER_CYCLE) {
      throw new BadRequestException(
        `الطالب استهلك أقصى عدد ريست مسموح (${MAX_RESETS_PER_CYCLE}) لهذه الدورة`,
      )
    }
    student.resetsUsed += 1
    student.lastResetAt = new Date()
    // بيقفل الحساب على جهاز جديد فورًا وقت أول تسجيل دخول تالي — قبل كده كان
    // بيتسجل بس في الـ log من غير ما يفك القفل فعليًا (باج حقيقي، شوف الخطة).
    student.deviceIdentifier = null
    await this.studentsRepo.save(student)

    await this.resetLogsRepo.save(
      this.resetLogsRepo.create({
        studentId: student.id,
        deviceModel: student.deviceModel ?? 'غير معروف',
        byAdmin: admin.name,
      }),
    )
    await this.logActivity(ActionType.DEVICE_RESET, student, admin, {
      details: student.deviceModel ? `الجهاز ${student.deviceModel}` : undefined,
    })
    return { ok: true, resetsUsed: student.resetsUsed }
  }

  async cancelSubscription(studentId: string, subscriptionId: string, admin: JwtPayload) {
    const student = await this.mustFind(studentId)
    const sub = await this.subscriptionsRepo.findOne({
      where: { id: subscriptionId, studentId },
    })
    if (!sub) throw new NotFoundException('الاشتراك غير موجود')
    sub.status = SubscriptionStatus.CANCELLED
    await this.subscriptionsRepo.save(sub)
    await this.logActivity(ActionType.CANCEL_SUBSCRIPTION, student, admin, {
      courseNameSnapshot: sub.courseName,
    })

    await this.notificationsService.notifyStudent(
      student.id,
      NotificationType.SUBSCRIPTION_CANCELLED,
      `subscription:${sub.id}:cancelled`,
      'تم إلغاء اشتراكك',
      `تم إلغاء اشتراكك في "${sub.courseName}"`,
      { courseId: sub.courseId ?? '' },
    )

    return { ok: true }
  }

  /**
   * تنشيط اشتراك ملغي **نفسه** (مش فتح كورس جديد) — بيرجّع الصف الموجود
   * لـ ACTIVE من غير ما يخلق صف تاني، عكس openCourse.
   */
  async reactivateSubscription(studentId: string, subscriptionId: string, admin: JwtPayload) {
    const student = await this.mustFind(studentId)
    const sub = await this.subscriptionsRepo.findOne({
      where: { id: subscriptionId, studentId },
    })
    if (!sub) throw new NotFoundException('الاشتراك غير موجود')
    if (sub.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException('الاشتراك نشط بالفعل')
    }
    sub.status = SubscriptionStatus.ACTIVE
    await this.subscriptionsRepo.save(sub)
    await this.logActivity(ActionType.REACTIVATE_SUBSCRIPTION, student, admin, {
      courseNameSnapshot: sub.courseName,
    })
    return { ok: true }
  }

  async openCourse(studentId: string, dto: OpenCourseDto, admin: JwtPayload) {
    const student = await this.mustFind(studentId)
    const sub = await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        studentId: student.id,
        courseName: dto.courseName,
        collegeName: dto.collegeName ?? '—',
        price: dto.price ?? 0,
        status: SubscriptionStatus.ACTIVE,
      }),
    )
    await this.logActivity(ActionType.OPEN_COURSE, student, admin, {
      courseNameSnapshot: dto.courseName,
    })
    return { ok: true, subscriptionId: sub.id }
  }

  private async mustFind(id: string): Promise<Student> {
    const student = await this.studentsRepo.findOne({ where: { id } })
    if (!student) throw new NotFoundException('الطالب غير موجود')
    return student
  }

  private async logActivity(
    actionType: ActionType,
    student: Student,
    admin: JwtPayload,
    extra: { details?: string; courseNameSnapshot?: string },
  ) {
    await this.activityRepo.save(
      this.activityRepo.create({
        actionType,
        studentId: student.id,
        studentNameSnapshot: student.name,
        adminId: admin.sub,
        adminName: admin.name,
        ...extra,
      }),
    )
  }
}
