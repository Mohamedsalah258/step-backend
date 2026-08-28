import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Course } from '../database/entities/course.entity'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { CourseStatus } from '../database/entities/course-status.enum'
import {
  CourseContentItem,
} from '../database/entities/course-content-item.entity'
import { CourseContentType } from '../database/entities/course-content-type.enum'
import { ContentProgress } from '../database/entities/content-progress.entity'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { PaginatedResult } from '../common/paginated-result'
import { ActionType } from '../common/action-catalog'
import type { JwtPayload } from '../auth/jwt.strategy'
import { NotificationsService } from '../notifications/notifications.service'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { ListCoursesQueryDto } from './dto/list-courses-query.dto'
import { ListStudentCoursesQueryDto } from './dto/list-student-courses-query.dto'
import { CreateContentItemDto } from './dto/create-content-item.dto'
import { UpdateContentItemDto } from './dto/update-content-item.dto'

const COURSE_STATUS_AR: Record<CourseStatus, string> = {
  [CourseStatus.DRAFT]: 'مسوّدة',
  [CourseStatus.PUBLISHED]: 'منشور',
  [CourseStatus.WITHDRAWN]: 'مسحوب',
}

const CONTENT_TYPE_AR: Record<CourseContentType, string> = {
  [CourseContentType.VIDEO]: 'فيديو',
  [CourseContentType.NOTE]: 'مذكرة',
  [CourseContentType.SUMMARY]: 'ملخص',
  [CourseContentType.EXAM]: 'امتحان',
}

/** الحالة المبسّطة اللي شايفها المستخدم في قائمة الكورسات (مفعّل/معطّل) */
function simpleStatusAr(status: CourseStatus): string {
  return status === CourseStatus.PUBLISHED ? 'مفعّل' : 'معطّل'
}

@Injectable()
export class CoursesService {
  constructor(
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(University) private universitiesRepo: Repository<University>,
    @InjectRepository(College) private collegesRepo: Repository<College>,
    @InjectRepository(Specialization)
    private specializationsRepo: Repository<Specialization>,
    @InjectRepository(Stage) private stagesRepo: Repository<Stage>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(CourseContentItem)
    private contentRepo: Repository<CourseContentItem>,
    @InjectRepository(ContentProgress)
    private progressRepo: Repository<ContentProgress>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(PurchaseRequest) private purchaseRequestsRepo: Repository<PurchaseRequest>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
    private notificationsService: NotificationsService,
  ) {}

  async list(query: ListCoursesQueryDto): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const qb = this.coursesRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.college', 'college')
      .leftJoinAndSelect('course.term', 'term')

    if (query.q) {
      qb.andWhere('course.name ILIKE :q', { q: `%${query.q}%` })
    }
    if (query.collegeId) {
      qb.andWhere('course.collegeId = :collegeId', { collegeId: query.collegeId })
    }
    if (query.tab === 'active') {
      qb.andWhere('course.status = :status', { status: CourseStatus.PUBLISHED })
    } else if (query.tab === 'inactive') {
      qb.andWhere('course.status != :status', { status: CourseStatus.PUBLISHED })
    }

    const total = await qb.getCount()
    const rows = await qb
      .orderBy('course.order', 'ASC')
      .addOrderBy('course.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const data = await Promise.all(
      rows.map(async (c, i) => {
        const [videos, students] = await Promise.all([
          this.contentRepo.count({ where: { courseId: c.id, type: CourseContentType.VIDEO } }),
          // الاشتراكات الحقيقية (موافقة طلب شراء، Phase 3) عندها courseId FK
          // مباشر. الاشتراكات القديمة (فتح يدوي أو seed) لسه بتتطابق بالاسم بس
          // — الشرطين مع بعض عشان العدّ يفضل صحيح للاتنين.
          this.subscriptionsRepo
            .createQueryBuilder('s')
            .where('s."courseId" = :cid OR s."courseName" = :cname', {
              cid: c.id,
              cname: c.name,
            })
            .getCount(),
        ])
        return {
          id: c.id,
          index: String((page - 1) * limit + i + 1),
          name: c.name,
          college: c.college.name,
          term: c.term.name,
          price: c.price,
          isFree: c.isFree,
          videos,
          students,
          status: simpleStatusAr(c.status),
        }
      }),
    )

    const [all, active, inactive] = await Promise.all([
      this.coursesRepo.count(),
      this.coursesRepo.count({ where: { status: CourseStatus.PUBLISHED } }),
      this.coursesRepo.count(),
    ])

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        tabs: { all, active, inactive: inactive - active },
      },
    }
  }

  /* ======================================================================
   * الجزء ده كله للطالب (تطبيق الموبايل) — تصفّح الكورسات المنشورة بس،
   * والوصول للمحتوى محكوم باشتراك فعلي (أو كورس مجاني). عكس باقي methods
   * الكلاس دي اللي كلها للأدمن.
   * ====================================================================== */

  async listPublished(
    query: ListStudentCoursesQueryDto,
    studentId: string,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 12

    const qb = this.coursesRepo
      .createQueryBuilder('course')
      .leftJoinAndSelect('course.college', 'college')
      .leftJoinAndSelect('course.term', 'term')
      .where('course.status = :status', { status: CourseStatus.PUBLISHED })

    if (query.q) qb.andWhere('course.name ILIKE :q', { q: `%${query.q}%` })
    if (query.universityId) {
      qb.andWhere('course.universityId = :universityId', { universityId: query.universityId })
    }
    if (query.collegeId) qb.andWhere('course.collegeId = :collegeId', { collegeId: query.collegeId })
    if (query.specializationId) {
      qb.andWhere('course.specializationId = :specializationId', {
        specializationId: query.specializationId,
      })
    }
    if (query.stageId) qb.andWhere('course.stageId = :stageId', { stageId: query.stageId })
    if (query.termId) qb.andWhere('course.termId = :termId', { termId: query.termId })

    const total = await qb.getCount()
    const rows = await qb
      .orderBy('course.order', 'ASC')
      .addOrderBy('course.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const subscribedIds = await this.subscribedCourseKeys(studentId)

    return {
      data: rows.map((c) => this.toStudentCourseSummary(c, subscribedIds)),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  }

  async getPublicDetail(id: string, studentId: string) {
    const course = await this.coursesRepo.findOne({
      where: { id, status: CourseStatus.PUBLISHED },
      relations: ['college', 'term', 'university', 'specialization', 'stage'],
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')

    const subscribedIds = await this.subscribedCourseKeys(studentId)
    const subscribed = subscribedIds.has(course.id) || subscribedIds.has(course.name)
    const [videos, notes, summaries, exams] = await Promise.all([
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.VIDEO } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.NOTE } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.SUMMARY } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.EXAM } }),
    ])

    return {
      ...this.toStudentCourseSummary(course, subscribedIds),
      description: course.description,
      universityId: course.universityId,
      collegeId: course.collegeId,
      specializationId: course.specializationId,
      stageId: course.stageId,
      termId: course.termId,
      tabCounts: { videos, notes, summaries, exams },
      /** null لو الطالب مش مشترك (ولا هو مجاني) — التقدّم ملوش معنى وقتها */
      progress: subscribed || course.isFree ? await this.courseProgress(id, studentId) : null,
    }
  }

  /** محتوى الكورس (فيديو/مذكرة/ملخص/امتحان) — محجوب إلا لمشترك فعلي أو لو الكورس مجاني */
  async listContentForStudent(courseId: string, type: CourseContentType, studentId: string) {
    const course = await this.coursesRepo.findOne({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')

    if (!course.isFree) {
      const subscribedIds = await this.subscribedCourseKeys(studentId)
      if (!subscribedIds.has(course.id) && !subscribedIds.has(course.name)) {
        throw new ForbiddenException('لازم تشترك في الكورس ده الأول عشان توصل للمحتوى')
      }
    }

    const items = await this.listContent(courseId, type)
    const completedIds = await this.completedItemIds(
      studentId,
      items.map((i) => i.id),
    )
    return items.map((i) => ({ ...i, completed: completedIds.has(i.id) }))
  }

  /** بيعلّم عنصر محتوى "مكتمل" للطالب — idempotent (تكرار الطلب مالوش أثر إضافي) */
  async markContentComplete(courseId: string, itemId: string, studentId: string) {
    await this.mustAccessContent(courseId, itemId, studentId)
    const existing = await this.progressRepo.findOne({
      where: { studentId, contentItemId: itemId },
    })
    if (!existing) {
      await this.progressRepo.save(this.progressRepo.create({ studentId, contentItemId: itemId }))
    }
    return { ok: true }
  }

  async markContentIncomplete(courseId: string, itemId: string, studentId: string) {
    await this.mustAccessContent(courseId, itemId, studentId)
    await this.progressRepo.delete({ studentId, contentItemId: itemId })
    return { ok: true }
  }

  /** الكورسات اللي الطالب مشترك فيها فعليًا (نشطة بس) */
  async listMyCourses(studentId: string) {
    const rows = await this.subscriptionsRepo.find({
      where: { studentId, status: SubscriptionStatus.ACTIVE },
      relations: ['course', 'course.college', 'course.term'],
      order: { subscribedAt: 'DESC' },
    })
    return Promise.all(
      rows.map(async (s) => ({
        subscriptionId: s.id,
        courseId: s.courseId,
        name: s.course?.name ?? s.courseName,
        college: s.course?.college?.name ?? s.collegeName,
        term: s.course?.term?.name ?? null,
        coverFileId: s.course?.coverFileId ?? null,
        price: s.price,
        subscribedAt: s.subscribedAt.toISOString(),
        // اشتراكات قديمة (فتح يدوي/seed) بلا courseId FK — مفيش عناصر محتوى نقيسها بيها
        progress: s.courseId
          ? await this.courseProgress(s.courseId, studentId)
          : { completed: 0, total: 0, percent: 0 },
      })),
    )
  }

  /** اشتراك فوري بكورس مجاني — من غير ما يعدّي على طلبات الشراء خالص */
  async enrollFree(courseId: string, studentId: string) {
    const course = await this.coursesRepo.findOne({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
      relations: ['college'],
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')
    if (!course.isFree) throw new BadRequestException('الكورس ده مش مجاني — لازم تشتريه الأول')

    const subscribedIds = await this.subscribedCourseKeys(studentId)
    if (subscribedIds.has(course.id) || subscribedIds.has(course.name)) {
      return { ok: true }
    }

    await this.subscriptionsRepo.save(
      this.subscriptionsRepo.create({
        studentId,
        courseId: course.id,
        courseName: course.name,
        collegeName: course.college?.name ?? '—',
        price: 0,
        status: SubscriptionStatus.ACTIVE,
      }),
    )
    return { ok: true }
  }

  /** مجموعة courseId + courseName لكل اشتراكات الطالب النشطة — للمطابقة
   * القديمة (اشتراكات بلا FK حقيقي) والجديدة مع بعض، بنداء واحد بدل N+1. */
  private async subscribedCourseKeys(studentId: string): Promise<Set<string>> {
    const rows = await this.subscriptionsRepo.find({
      where: { studentId, status: SubscriptionStatus.ACTIVE },
      select: ['courseId', 'courseName'],
    })
    const keys = new Set<string>()
    for (const r of rows) {
      if (r.courseId) keys.add(r.courseId)
      keys.add(r.courseName)
    }
    return keys
  }

  private toStudentCourseSummary(course: Course, subscribedKeys: Set<string>) {
    return {
      id: course.id,
      name: course.name,
      college: course.college?.name ?? null,
      term: course.term?.name ?? null,
      price: course.price,
      isFree: course.isFree,
      coverFileId: course.coverFileId,
      subscribed: subscribedKeys.has(course.id) || subscribedKeys.has(course.name),
    }
  }

  /** نفس شرط الوصول للمحتوى (مشترك أو كورس مجاني) — مستخدم قبل تعليم أي
   * عنصر مكتمل/غير مكتمل، عشان محدش يعلّم تقدّم في كورس مالوش وصول له. */
  private async mustAccessContent(
    courseId: string,
    itemId: string,
    studentId: string,
  ): Promise<void> {
    const item = await this.contentRepo.findOne({ where: { id: itemId, courseId } })
    if (!item) throw new NotFoundException('العنصر غير موجود')

    const course = await this.coursesRepo.findOne({
      where: { id: courseId, status: CourseStatus.PUBLISHED },
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')

    if (!course.isFree) {
      const subscribedIds = await this.subscribedCourseKeys(studentId)
      if (!subscribedIds.has(course.id) && !subscribedIds.has(course.name)) {
        throw new ForbiddenException('لازم تشترك في الكورس ده الأول')
      }
    }
  }

  private async completedItemIds(studentId: string, itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) return new Set()
    const rows = await this.progressRepo.find({
      where: { studentId, contentItemId: In(itemIds) },
      select: ['contentItemId'],
    })
    return new Set(rows.map((r) => r.contentItemId))
  }

  /** نسبة إكمال الكورس — عدد عناصر المحتوى (كل الأنواع مع بعض) اللي
   * الطالب علّمها مكتملة من إجمالي عناصر الكورس. */
  private async courseProgress(
    courseId: string,
    studentId: string,
  ): Promise<{ completed: number; total: number; percent: number }> {
    const total = await this.contentRepo.count({ where: { courseId } })
    if (total === 0) return { completed: 0, total: 0, percent: 0 }

    const completed = await this.progressRepo
      .createQueryBuilder('p')
      .innerJoin(CourseContentItem, 'ci', 'ci.id = p."contentItemId" AND ci."courseId" = :courseId', {
        courseId,
      })
      .where('p."studentId" = :studentId', { studentId })
      .getCount()

    return { completed, total, percent: Math.round((completed / total) * 100) }
  }

  async create(dto: CreateCourseDto, admin: JwtPayload) {
    await Promise.all([
      this.mustExist(this.universitiesRepo, dto.universityId, 'الجامعة غير موجودة'),
      this.mustExist(this.collegesRepo, dto.collegeId, 'الكلية غير موجودة'),
      this.mustExist(this.specializationsRepo, dto.specializationId, 'التخصص غير موجود'),
      this.mustExist(this.stagesRepo, dto.stageId, 'المرحلة غير موجودة'),
      this.mustExist(this.termsRepo, dto.termId, 'الترم غير موجود'),
    ])
    const saved = await this.coursesRepo.save(
      this.coursesRepo.create({
        name: dto.name,
        description: dto.description ?? null,
        universityId: dto.universityId,
        collegeId: dto.collegeId,
        specializationId: dto.specializationId,
        stageId: dto.stageId,
        termId: dto.termId,
        price: dto.isFree ? 0 : (dto.price ?? 0),
        isFree: dto.isFree ?? false,
        coverFileId: dto.coverFileId ?? null,
        order: dto.order ?? 0,
        status: dto.status ?? CourseStatus.DRAFT,
      }),
    )
    await this.logCourseActivity(ActionType.CREATE_COURSE, saved.name, admin)

    if (saved.status === CourseStatus.PUBLISHED) {
      await this.notificationsService.notifyStudentsMatchingAcademics(
        {
          collegeId: saved.collegeId,
          specializationId: saved.specializationId,
          stageId: saved.stageId,
          termId: saved.termId,
        },
        NotificationType.NEW_COURSE_IN_STAGE,
        `course:${saved.id}:published`,
        'كورس جديد!',
        `تم إضافة كورس "${saved.name}" لمرحلتك`,
        { courseId: saved.id },
      )
    }

    return { ok: true, id: saved.id }
  }

  async getDetail(id: string) {
    const course = await this.mustFindCourse(id)
    const [videos, notes, summaries, exams] = await Promise.all([
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.VIDEO } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.NOTE } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.SUMMARY } }),
      this.contentRepo.count({ where: { courseId: id, type: CourseContentType.EXAM } }),
    ])
    return {
      id: course.id,
      name: course.name,
      description: course.description,
      path: `${course.stage.name} / ${course.term.name} / ${course.university.name} / ${course.college.name}`,
      price: course.price,
      isFree: course.isFree,
      coverFileId: course.coverFileId,
      order: course.order,
      status: COURSE_STATUS_AR[course.status],
      statusRaw: course.status,
      universityId: course.universityId,
      collegeId: course.collegeId,
      specializationId: course.specializationId,
      stageId: course.stageId,
      termId: course.termId,
      tabCounts: { videos, notes, summaries, exams },
    }
  }

  /**
   * إحصائيات الكورس — عدد الطلاب المشتركين فعليًا (نفس منطق مطابقة courseId/
   * courseName في list()) والدخل الحقيقي من طلبات الشراء المقبولة بس.
   */
  async getStats(id: string) {
    const course = await this.mustFindCourse(id)
    const [studentsCount, revenueRow] = await Promise.all([
      this.subscriptionsRepo
        .createQueryBuilder('s')
        .where('(s."courseId" = :cid OR s."courseName" = :cname) AND s.status = :status', {
          cid: course.id,
          cname: course.name,
          status: SubscriptionStatus.ACTIVE,
        })
        .getCount(),
      this.purchaseRequestsRepo
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.amount), 0)', 'total')
        .where('o."courseId" = :cid AND o.status = :status', {
          cid: course.id,
          status: PurchaseRequestStatus.APPROVED,
        })
        .getRawOne<{ total: string }>(),
    ])
    return {
      studentsCount,
      revenue: Number(revenueRow?.total ?? 0),
    }
  }

  async update(id: string, dto: UpdateCourseDto, admin: JwtPayload) {
    const course = await this.mustFindCourse(id)

    // الهيكل الأكاديمي كله-أو-ولا-حاجة — تفادي تناقض (كلية من جامعة، تخصص من جامعة تانية)
    const parentFields = [
      dto.universityId,
      dto.collegeId,
      dto.specializationId,
      dto.stageId,
      dto.termId,
    ]
    const anyParentGiven = parentFields.some((f) => f !== undefined)
    if (anyParentGiven) {
      if (parentFields.some((f) => f === undefined)) {
        throw new BadRequestException('لازم تبعت الهيكل الأكاديمي كامل (الجامعة/الكلية/التخصص/المرحلة/الترم) مع بعض')
      }
      await Promise.all([
        this.mustExist(this.universitiesRepo, dto.universityId!, 'الجامعة غير موجودة'),
        this.mustExist(this.collegesRepo, dto.collegeId!, 'الكلية غير موجودة'),
        this.mustExist(this.specializationsRepo, dto.specializationId!, 'التخصص غير موجود'),
        this.mustExist(this.stagesRepo, dto.stageId!, 'المرحلة غير موجودة'),
        this.mustExist(this.termsRepo, dto.termId!, 'الترم غير موجود'),
      ])
    }

    // .update() مباشر (مش .save() على entity محمّل بعلاقات) — عشان الـ college/
    // university/... relations المحمّلة من mustFindCourse متتعارضش مع الـ FK
    // columns الجديدة (collegeId الجديد ممكن يتجاهل لو الـ relation القديمة
    // فضلت متحمّلة على نفس الـ object وقت الـ save).
    await this.coursesRepo.update(id, dto)
    await this.logCourseActivity(ActionType.UPDATE_COURSE, dto.name ?? course.name, admin)
    return { ok: true }
  }

  /** زرار "تعطيل" السريع في صف الجدول — تبديل ثنائي بين منشور/مسحوب */
  async toggle(id: string, admin: JwtPayload) {
    const course = await this.mustFindCourse(id)
    course.status =
      course.status === CourseStatus.PUBLISHED ? CourseStatus.WITHDRAWN : CourseStatus.PUBLISHED
    await this.coursesRepo.save(course)
    await this.logCourseActivity(
      course.status === CourseStatus.PUBLISHED
        ? ActionType.PUBLISH_COURSE
        : ActionType.WITHDRAW_COURSE,
      course.name,
      admin,
    )

    if (course.status === CourseStatus.PUBLISHED) {
      await this.notificationsService.notifyStudentsMatchingAcademics(
        {
          collegeId: course.collegeId,
          specializationId: course.specializationId,
          stageId: course.stageId,
          termId: course.termId,
        },
        NotificationType.NEW_COURSE_IN_STAGE,
        `course:${course.id}:published`,
        'كورس جديد!',
        `تم إضافة كورس "${course.name}" لمرحلتك`,
        { courseId: course.id },
      )
    }

    return { ok: true, status: COURSE_STATUS_AR[course.status] }
  }

  async delete(id: string, admin: JwtPayload) {
    const course = await this.mustFindCourse(id)
    await this.coursesRepo.delete(id)
    await this.logCourseActivity(ActionType.DELETE_COURSE, course.name, admin)
    return { ok: true }
  }

  async listContent(courseId: string, type: CourseContentType) {
    await this.mustFindCourse(courseId)
    const rows = await this.contentRepo.find({
      where: { courseId, type },
      order: { order: 'ASC' },
    })
    return rows.map((r, i) => ({
      id: r.id,
      index: String(i + 1),
      title: r.title,
      description: r.description,
      fileId: r.fileId,
      externalUrl: r.externalUrl,
      order: r.order,
      createdAt: r.createdAt.toISOString(),
    }))
  }

  async createContent(courseId: string, type: CourseContentType, dto: CreateContentItemDto) {
    const course = await this.mustFindCourse(courseId)
    if (!dto.fileId && !dto.externalUrl) {
      throw new BadRequestException('لازم ترفع ملف أو تحط رابط خارجي')
    }
    if (type !== CourseContentType.VIDEO && dto.externalUrl) {
      throw new BadRequestException('الرابط الخارجي متاح للفيديو بس')
    }

    const order = await this.resolveInsertOrder(courseId, type, dto.order)

    const saved = await this.contentRepo.save(
      this.contentRepo.create({
        courseId,
        type,
        title: dto.title,
        description: dto.description ?? null,
        fileId: dto.fileId ?? null,
        externalUrl: dto.externalUrl ?? null,
        order,
      }),
    )

    await this.notificationsService.notifyEnrolledStudents(
      courseId,
      NotificationType.NEW_COURSE_CONTENT,
      `content:${saved.id}:created`,
      'محتوى جديد',
      `تم إضافة ${CONTENT_TYPE_AR[type]} جديد في كورس "${course.name}"`,
      { courseId, itemId: saved.id },
    )

    return { ok: true, id: saved.id }
  }

  /**
   * "ترتيب الفيديو" في فورم الإضافة معناه "حطّه في الموضع ده" مش رقم حر —
   * لو حد تاني عنده نفس الموضع، بننقله وكل اللي بعده موضع واحد لقدام بدل
   * ما نسيب رقمين متساويين (كان ده الباج: ضيف فيديو بترتيب 1 والقديم برضو
   * ترتيبه 1، النتيجة ترتيب غير محدد بين الاتنين). لو الفورم مبعتش رقم
   * خالص (زي المذكرات/الامتحانات/الملخصات دلوقتي)، بنضيفه في الآخر.
   */
  private async resolveInsertOrder(
    courseId: string,
    type: CourseContentType,
    requestedOrder?: number,
  ): Promise<number> {
    if (requestedOrder === undefined) {
      const row = await this.contentRepo
        .createQueryBuilder('c')
        .select('MAX(c."order")', 'max')
        .where('c."courseId" = :courseId AND c.type = :type', { courseId, type })
        .getRawOne<{ max: string | null }>()
      return (row?.max ? Number(row.max) : -1) + 1
    }

    await this.contentRepo
      .createQueryBuilder()
      .update(CourseContentItem)
      .set({ order: () => '"order" + 1' })
      .where('"courseId" = :courseId AND type = :type AND "order" >= :order', {
        courseId,
        type,
        order: requestedOrder,
      })
      .execute()
    return requestedOrder
  }

  async updateContent(itemId: string, dto: UpdateContentItemDto) {
    const item = await this.mustFindContent(itemId)
    const { order, ...fields } = dto
    if (order !== undefined && order !== item.order) {
      await this.moveContent(item, order)
    }
    if (Object.keys(fields).length > 0) {
      await this.contentRepo.update(itemId, fields)
    }
    return { ok: true }
  }

  /**
   * نقل عنصر موجود لموضع جديد بين أقرانه (نفس الكورس والنوع) — "تحريك" مش
   * "استبدال رقم حر"، عشان مايتكررش نفس الترتيب مع عنصر تاني (نفس باج
   * resolveInsertOrder، بس هنا العنصر أصلًا واخد موضع لازم نقفل الفجوة اللي
   * هيسيبها وراه قبل ما نفتح مكان له في الموضع الجديد).
   */
  private async moveContent(item: CourseContentItem, requestedOrder: number): Promise<void> {
    const count = await this.contentRepo.count({
      where: { courseId: item.courseId, type: item.type },
    })
    const newOrder = Math.max(0, Math.min(requestedOrder, count - 1))
    if (newOrder === item.order) return

    if (newOrder > item.order) {
      await this.contentRepo
        .createQueryBuilder()
        .update(CourseContentItem)
        .set({ order: () => '"order" - 1' })
        .where(
          '"courseId" = :courseId AND type = :type AND "order" > :oldOrder AND "order" <= :newOrder',
          { courseId: item.courseId, type: item.type, oldOrder: item.order, newOrder },
        )
        .execute()
    } else {
      await this.contentRepo
        .createQueryBuilder()
        .update(CourseContentItem)
        .set({ order: () => '"order" + 1' })
        .where(
          '"courseId" = :courseId AND type = :type AND "order" >= :newOrder AND "order" < :oldOrder',
          { courseId: item.courseId, type: item.type, oldOrder: item.order, newOrder },
        )
        .execute()
    }
    await this.contentRepo.update(item.id, { order: newOrder })
  }

  async deleteContent(itemId: string) {
    await this.mustFindContent(itemId)
    await this.contentRepo.delete(itemId)
    return { ok: true }
  }

  async reorderContent(courseId: string, type: CourseContentType, ids: string[]) {
    await this.mustFindCourse(courseId)
    await Promise.all(
      ids.map((id, index) => this.contentRepo.update({ id, courseId, type }, { order: index })),
    )
    return { ok: true }
  }

  private async mustFindCourse(id: string): Promise<Course> {
    const course = await this.coursesRepo.findOne({
      where: { id },
      relations: ['college', 'term', 'university', 'stage'],
    })
    if (!course) throw new NotFoundException('الكورس غير موجود')
    return course
  }

  private async mustFindContent(id: string): Promise<CourseContentItem> {
    const item = await this.contentRepo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('العنصر غير موجود')
    return item
  }

  /** بيسجل حدث كورس في نفس جدول أنشطة الطلاب — بلا طالب محدد (studentId: null)،
   * فيظهر في "آخر الأنشطة" بالداشبورد وسجل الأنشطة تحت اسم الكورس بس. */
  private async logCourseActivity(
    actionType: ActionType,
    courseName: string,
    admin: JwtPayload,
  ): Promise<void> {
    await this.activityRepo.save(
      this.activityRepo.create({
        actionType,
        studentId: null,
        studentNameSnapshot: null,
        courseNameSnapshot: courseName,
        adminId: admin.sub,
        adminName: admin.name,
      }),
    )
  }

  private async mustExist<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    message: string,
  ): Promise<void> {
    const found = await repo.findOne({ where: { id } as never })
    if (!found) throw new NotFoundException(message)
  }
}
