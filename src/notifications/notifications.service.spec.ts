import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { In } from 'typeorm'
import { NotificationsService } from './notifications.service'
import { Notification } from '../database/entities/notification.entity'
import { NotificationBatch } from '../database/entities/notification-batch.entity'
import { NotificationType } from '../database/entities/notification-type.enum'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { Course } from '../database/entities/course.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import { getFirebaseMessaging } from './firebase-admin.util'

const ADMIN = { sub: 'admin-1', email: 'a@a.com', name: 'الأدمن' }

jest.mock('./firebase-admin.util')
const mockGetFirebaseMessaging = getFirebaseMessaging as jest.Mock

function makeQueryBuilder() {
  return {
    insert: jest.fn().mockReturnThis(),
    into: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    orIgnore: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  }
}

describe('NotificationsService', () => {
  let service: NotificationsService
  let notificationsRepo: {
    create: jest.Mock
    save: jest.Mock
    findAndCount: jest.Mock
    count: jest.Mock
    findOne: jest.Mock
    update: jest.Mock
    createQueryBuilder: jest.Mock
  }
  let studentsRepo: { find: jest.Mock; findOne: jest.Mock; update: jest.Mock }
  let subscriptionsRepo: { find: jest.Mock }
  let batchesRepo: { create: jest.Mock; save: jest.Mock; findAndCount: jest.Mock }
  let coursesRepo: { findOne: jest.Mock }
  let stagesRepo: { findOne: jest.Mock }
  let termsRepo: { findOne: jest.Mock }
  let activityRepo: { create: jest.Mock; save: jest.Mock }
  let purchaseRequestsRepo: { find: jest.Mock }
  let queryBuilder: ReturnType<typeof makeQueryBuilder>

  beforeEach(async () => {
    queryBuilder = makeQueryBuilder()
    notificationsRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockResolvedValue({}),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => queryBuilder),
    }
    studentsRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn(), update: jest.fn() }
    subscriptionsRepo = { find: jest.fn().mockResolvedValue([]) }
    batchesRepo = {
      create: jest.fn((v) => v),
      save: jest.fn().mockImplementation((v) => Promise.resolve({ id: 'batch-1', ...v })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    }
    coursesRepo = { findOne: jest.fn().mockResolvedValue(null) }
    stagesRepo = { findOne: jest.fn().mockResolvedValue(null) }
    termsRepo = { findOne: jest.fn().mockResolvedValue(null) }
    activityRepo = { create: jest.fn((v) => v), save: jest.fn().mockResolvedValue({}) }
    purchaseRequestsRepo = { find: jest.fn().mockResolvedValue([]) }

    mockGetFirebaseMessaging.mockReturnValue(null)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notificationsRepo },
        { provide: getRepositoryToken(NotificationBatch), useValue: batchesRepo },
        { provide: getRepositoryToken(Student), useValue: studentsRepo },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionsRepo },
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Stage), useValue: stagesRepo },
        { provide: getRepositoryToken(Term), useValue: termsRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: activityRepo },
        { provide: getRepositoryToken(PurchaseRequest), useValue: purchaseRequestsRepo },
      ],
    }).compile()

    service = module.get(NotificationsService)
  })

  afterEach(() => jest.clearAllMocks())

  describe('notifyStudent', () => {
    it('يحفظ إشعار ويبعت push لو الطالب عنده fcmToken', async () => {
      studentsRepo.findOne.mockResolvedValue({ id: 's1', fcmToken: 'token-1' })
      const messaging = { sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [{ success: true }] }) }
      mockGetFirebaseMessaging.mockReturnValue(messaging)

      await service.notifyStudent('s1', NotificationType.ACCOUNT_BANNED, 'student:s1:banned', 'title', 'body')

      expect(notificationsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 's1', sourceKey: 'student:s1:banned' }),
      )
      expect(messaging.sendEachForMulticast).toHaveBeenCalledWith(
        expect.objectContaining({ tokens: ['token-1'] }),
      )
    })

    it('مايبعتش push لو الطالب مفيهوش fcmToken، بس بيحفظ الإشعار', async () => {
      studentsRepo.findOne.mockResolvedValue({ id: 's1', fcmToken: null })
      const messaging = { sendEachForMulticast: jest.fn() }
      mockGetFirebaseMessaging.mockReturnValue(messaging)

      await service.notifyStudent('s1', NotificationType.ACCOUNT_BANNED, 'student:s1:banned', 'title', 'body')

      expect(notificationsRepo.save).toHaveBeenCalled()
      expect(messaging.sendEachForMulticast).not.toHaveBeenCalled()
    })

    it('بيبتلع unique violation صامت من غير throw (idempotency)', async () => {
      studentsRepo.findOne.mockResolvedValue({ id: 's1', fcmToken: null })
      notificationsRepo.save.mockRejectedValue({ code: '23505' })

      await expect(
        service.notifyStudent('s1', NotificationType.ACCOUNT_BANNED, 'student:s1:banned', 'title', 'body'),
      ).resolves.toBeUndefined()
    })

    it('مايعملش throw حتى لو حصل خطأ مش متوقع خالص (best effort)', async () => {
      studentsRepo.findOne.mockRejectedValue(new Error('DB down'))

      await expect(
        service.notifyStudent('s1', NotificationType.ACCOUNT_BANNED, 'k', 'title', 'body'),
      ).resolves.toBeUndefined()
    })
  })

  describe('notifyStudentsMatchingAcademics', () => {
    it('بيفلتر بالأربع حقول الأكاديمية بالظبط + status=ACTIVE بس', async () => {
      await service.notifyStudentsMatchingAcademics(
        { collegeId: 'c1', specializationId: 'sp1', stageId: 'st1', termId: 't1' },
        NotificationType.NEW_COURSE_IN_STAGE,
        'course:x:published',
        'title',
        'body',
      )

      expect(studentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: StudentStatus.ACTIVE,
            collegeId: 'c1',
            specializationId: 'sp1',
            stageId: 'st1',
            termId: 't1',
          },
        }),
      )
    })

    it('بيعمل bulk insert بـ ON CONFLICT DO NOTHING للطلاب المطابقين', async () => {
      studentsRepo.find.mockResolvedValue([
        { id: 's1', fcmToken: null },
        { id: 's2', fcmToken: null },
      ])

      await service.notifyStudentsMatchingAcademics(
        { collegeId: 'c1', specializationId: 'sp1', stageId: 'st1', termId: 't1' },
        NotificationType.NEW_COURSE_IN_STAGE,
        'course:x:published',
        'title',
        'body',
      )

      expect(queryBuilder.values).toHaveBeenCalledWith([
        expect.objectContaining({ studentId: 's1' }),
        expect.objectContaining({ studentId: 's2' }),
      ])
      expect(queryBuilder.orIgnore).toHaveBeenCalled()
    })
  })

  describe('notifyEnrolledStudents', () => {
    it('بيفلتر courseId + status=ACTIVE بس (مش CANCELLED)', async () => {
      subscriptionsRepo.find.mockResolvedValue([{ studentId: 's1' }])
      studentsRepo.find.mockResolvedValue([{ id: 's1', fcmToken: null }])

      await service.notifyEnrolledStudents(
        'course-1',
        NotificationType.NEW_COURSE_CONTENT,
        'content:x:created',
        'title',
        'body',
      )

      expect(subscriptionsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: 'course-1', status: SubscriptionStatus.ACTIVE } }),
      )
    })

    it('من غير طلاب مشتركين مبيعملش أي insert', async () => {
      subscriptionsRepo.find.mockResolvedValue([])

      await service.notifyEnrolledStudents(
        'course-1',
        NotificationType.NEW_COURSE_CONTENT,
        'content:x:created',
        'title',
        'body',
      )

      expect(notificationsRepo.createQueryBuilder).not.toHaveBeenCalled()
    })
  })

  describe('markRead', () => {
    it('بيرفض بـ NotFoundException لو الإشعار مش موجود', async () => {
      notificationsRepo.findOne.mockResolvedValue(null)
      await expect(service.markRead('s1', 'n1')).rejects.toThrow(NotFoundException)
    })

    it('بيرفض بـ NotFoundException لو الإشعار بتاع طالب تاني', async () => {
      notificationsRepo.findOne.mockResolvedValue({ id: 'n1', studentId: 's2', isRead: false })
      await expect(service.markRead('s1', 'n1')).rejects.toThrow(NotFoundException)
    })

    it('بيحدّث isRead لو الإشعار بتاع نفس الطالب', async () => {
      notificationsRepo.findOne.mockResolvedValue({ id: 'n1', studentId: 's1', isRead: false })
      await service.markRead('s1', 'n1')
      expect(notificationsRepo.update).toHaveBeenCalledWith('n1', { isRead: true })
    })
  })

  describe('sendPush (عبر notifyStudentsMatchingAcademics)', () => {
    it('بيعمل no-op بأمان لو Firebase مش متبني (من غير throw)', async () => {
      mockGetFirebaseMessaging.mockReturnValue(null)
      studentsRepo.find.mockResolvedValue([{ id: 's1', fcmToken: 'token-1' }])

      await expect(
        service.notifyStudentsMatchingAcademics(
          { collegeId: 'c1', specializationId: 'sp1', stageId: 'st1', termId: 't1' },
          NotificationType.NEW_COURSE_IN_STAGE,
          'course:x:published',
          'title',
          'body',
        ),
      ).resolves.toBeUndefined()
    })

    it('بيقسّم أكتر من 500 recipient لـ chunks صحيحة', async () => {
      const students = Array.from({ length: 750 }, (_, i) => ({ id: `s${i}`, fcmToken: `token-${i}` }))
      studentsRepo.find.mockResolvedValue(students)
      const messaging = {
        sendEachForMulticast: jest.fn().mockResolvedValue({ responses: [] }),
      }
      mockGetFirebaseMessaging.mockReturnValue(messaging)

      await service.notifyStudentsMatchingAcademics(
        { collegeId: 'c1', specializationId: 'sp1', stageId: 'st1', termId: 't1' },
        NotificationType.NEW_COURSE_IN_STAGE,
        'course:x:published',
        'title',
        'body',
      )

      expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(2)
      expect(messaging.sendEachForMulticast.mock.calls[0][0].tokens).toHaveLength(500)
      expect(messaging.sendEachForMulticast.mock.calls[1][0].tokens).toHaveLength(250)
    })

    it('بيمسح fcmToken بتاع الطالب الصحيح بالظبط لما التوكن يرجع invalid', async () => {
      studentsRepo.find.mockResolvedValue([
        { id: 's1', fcmToken: 'good-token' },
        { id: 's2', fcmToken: 'bad-token' },
      ])
      const messaging = {
        sendEachForMulticast: jest.fn().mockResolvedValue({
          responses: [
            { success: true },
            { success: false, error: { code: 'messaging/registration-token-not-registered' } },
          ],
        }),
      }
      mockGetFirebaseMessaging.mockReturnValue(messaging)

      await service.notifyStudentsMatchingAcademics(
        { collegeId: 'c1', specializationId: 'sp1', stageId: 'st1', termId: 't1' },
        NotificationType.NEW_COURSE_IN_STAGE,
        'course:x:published',
        'title',
        'body',
      )

      expect(studentsRepo.update).toHaveBeenCalledWith({ id: In(['s2']) }, { fcmToken: null })
    })
  })

  describe('sendCustomNotification', () => {
    it('يستهدف كل الطلاب النشطين لما مفيش أي فلتر متحدد، وبيسجل نشاط', async () => {
      studentsRepo.find.mockResolvedValue([{ id: 's1', fcmToken: null }, { id: 's2', fcmToken: null }])

      const result = await service.sendCustomNotification(
        { title: 'عنوان', body: 'نص' },
        ADMIN,
      )

      expect(studentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: StudentStatus.ACTIVE } }),
      )
      expect(batchesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'عنوان', audienceLabel: 'كل الطلاب (2 طالب)', recipientCount: 2 }),
      )
      expect(activityRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: 'send_notification', adminId: 'admin-1' }),
      )
      expect(result).toEqual({ ok: true, id: 'batch-1', recipientCount: 2 })
    })

    it('يستهدف طلاب المشتركين في كورس معيّن بس لما courseId متحدد', async () => {
      subscriptionsRepo.find.mockResolvedValue([{ studentId: 's1' }])
      studentsRepo.find.mockResolvedValue([{ id: 's1', fcmToken: null }])
      coursesRepo.findOne.mockResolvedValue({ name: 'التشريح' })

      await service.sendCustomNotification({ title: 'ت', body: 'ب', courseId: 'course-1' }, ADMIN)

      expect(subscriptionsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { courseId: 'course-1', status: SubscriptionStatus.ACTIVE } }),
      )
      expect(studentsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: StudentStatus.ACTIVE, id: In(['s1']) } }),
      )
      expect(batchesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ audienceLabel: 'طلاب: كورس التشريح (1 طالب)' }),
      )
    })

    it('لو مفيش طلاب مشتركين في الكورس المحدد، مبيعملش أي insert وبيرجع صفر مستلمين', async () => {
      subscriptionsRepo.find.mockResolvedValue([])

      const result = await service.sendCustomNotification({ title: 'ت', body: 'ب', courseId: 'course-1' }, ADMIN)

      expect(notificationsRepo.createQueryBuilder).not.toHaveBeenCalled()
      expect(result.recipientCount).toBe(0)
    })
  })

  describe('previewAudience', () => {
    it('بيرجع نفس العدد والنص اللي هيستخدمهم الإرسال الفعلي', async () => {
      studentsRepo.find.mockResolvedValue([{ id: 's1', fcmToken: null }])

      const result = await service.previewAudience()

      expect(result).toEqual({ count: 1, label: 'كل الطلاب (1 طالب)' })
    })
  })

  describe('listBatches', () => {
    it('بيرجع الصفوف بشكل SentNotification (audience/date/status)', async () => {
      batchesRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'b1',
            title: 'عنوان',
            type: 'عام',
            audienceLabel: 'كل الطلاب (10 طالب)',
            status: 'مرسل',
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
        1,
      ])

      const result = await service.listBatches(1, 10)

      expect(result.data).toEqual([
        {
          id: 'b1',
          title: 'عنوان',
          type: 'عام',
          audience: 'كل الطلاب (10 طالب)',
          date: '2026-01-01T00:00:00.000Z',
          status: 'مرسل',
        },
      ])
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 })
    })
  })

  describe('adminAlerts', () => {
    it('بيرجع طلبات الشراء المعلّقة بس، بشكل AdminAlert', async () => {
      purchaseRequestsRepo.find.mockResolvedValue([
        {
          id: 'pr-1',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          student: { name: 'أحمد محمد' },
          course: { name: 'أساسيات التشريح', term: { name: 'الترم الأول' } },
        },
      ])

      const result = await service.adminAlerts(5)

      expect(purchaseRequestsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: PurchaseRequestStatus.PENDING }, take: 5 }),
      )
      expect(result).toEqual([
        {
          id: 'pr-1',
          time: '2026-01-01T00:00:00.000Z',
          title: 'طلب شراء جديد من أحمد محمد',
          desc: 'أساسيات التشريح — الترم الأول',
          tone: 'danger',
        },
      ])
    })

    it('بيستغنى عن اسم الترم لو الكورس مربوطش بترم', async () => {
      purchaseRequestsRepo.find.mockResolvedValue([
        {
          id: 'pr-2',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          student: { name: 'مريم' },
          course: { name: 'كورس حر', term: null },
        },
      ])

      const result = await service.adminAlerts(5)

      expect((result[0] as { desc: string }).desc).toBe('كورس حر')
    })
  })
})
