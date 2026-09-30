import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CoursesService } from './courses.service'
import { Course } from '../database/entities/course.entity'
import { Student } from '../database/entities/student.entity'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { CourseContentItem } from '../database/entities/course-content-item.entity'
import { ContentProgress } from '../database/entities/content-progress.entity'
import { Subscription } from '../database/entities/subscription.entity'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { NotificationsService } from '../notifications/notifications.service'

function makeQueryBuilder() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  }
}

describe('CoursesService.listPublished', () => {
  let service: CoursesService
  let coursesRepo: { createQueryBuilder: jest.Mock }
  let studentsRepo: { findOne: jest.Mock }
  let subscriptionsRepo: { find: jest.Mock }
  let queryBuilder: ReturnType<typeof makeQueryBuilder>

  beforeEach(async () => {
    queryBuilder = makeQueryBuilder()
    coursesRepo = { createQueryBuilder: jest.fn(() => queryBuilder) }
    studentsRepo = { findOne: jest.fn().mockResolvedValue(null) }
    subscriptionsRepo = { find: jest.fn().mockResolvedValue([]) }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: getRepositoryToken(Course), useValue: coursesRepo },
        { provide: getRepositoryToken(Student), useValue: studentsRepo },
        { provide: getRepositoryToken(University), useValue: {} },
        { provide: getRepositoryToken(College), useValue: {} },
        { provide: getRepositoryToken(Specialization), useValue: {} },
        { provide: getRepositoryToken(Stage), useValue: {} },
        { provide: getRepositoryToken(Term), useValue: {} },
        { provide: getRepositoryToken(CourseContentItem), useValue: {} },
        { provide: getRepositoryToken(ContentProgress), useValue: {} },
        { provide: getRepositoryToken(Subscription), useValue: subscriptionsRepo },
        { provide: getRepositoryToken(PurchaseRequest), useValue: {} },
        { provide: getRepositoryToken(ActivityLog), useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile()

    service = module.get(CoursesService)
  })

  it('يرجع نتيجة فاضية (مش كل الكورسات) لو بروفايل الطالب ناقص ومفيش فلاتر صريحة', async () => {
    studentsRepo.findOne.mockResolvedValue({
      universityId: null,
      collegeId: null,
      specializationId: null,
      stageId: null,
    })

    const result = await service.listPublished({}, 'student-1')

    expect(coursesRepo.createQueryBuilder).not.toHaveBeenCalled()
    expect(result).toEqual({ data: [], meta: { page: 1, limit: 12, total: 0, totalPages: 1 } })
  })

  it('بيرجع نتيجة فاضية لو بروفايل الطالب ناقص حقل واحد بس (مثلاً stageId)', async () => {
    studentsRepo.findOne.mockResolvedValue({
      universityId: 'u1',
      collegeId: 'c1',
      specializationId: 'sp1',
      stageId: null,
    })

    const result = await service.listPublished({}, 'student-1')

    expect(coursesRepo.createQueryBuilder).not.toHaveBeenCalled()
    expect(result.data).toEqual([])
  })

  it('بيستخدم بروفايل الطالب كفلتر افتراضي لو مفيش فلاتر صريحة من العميل', async () => {
    studentsRepo.findOne.mockResolvedValue({
      universityId: 'u1',
      collegeId: 'c1',
      specializationId: 'sp1',
      stageId: 'st1',
    })

    await service.listPublished({}, 'student-1')

    expect(coursesRepo.createQueryBuilder).toHaveBeenCalled()
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('course.universityId = :universityId', {
      universityId: 'u1',
    })
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('course.collegeId = :collegeId', {
      collegeId: 'c1',
    })
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('course.stageId = :stageId', { stageId: 'st1' })
  })

  it('الفلاتر الصريحة من العميل بتاخد أولوية على بروفايل الطالب', async () => {
    studentsRepo.findOne.mockResolvedValue({
      universityId: 'u1',
      collegeId: 'c1',
      specializationId: 'sp1',
      stageId: 'st1',
    })

    await service.listPublished({ universityId: 'u-explicit' }, 'student-1')

    expect(queryBuilder.andWhere).toHaveBeenCalledWith('course.universityId = :universityId', {
      universityId: 'u-explicit',
    })
  })

  it('لو مفيش سجل طالب خالص بس فيه فلاتر صريحة كاملة، بيستخدمها عادي', async () => {
    studentsRepo.findOne.mockResolvedValue(null)

    await service.listPublished(
      { universityId: 'u1', collegeId: 'c1', specializationId: 'sp1', stageId: 'st1' },
      'student-1',
    )

    expect(coursesRepo.createQueryBuilder).toHaveBeenCalled()
  })
})
