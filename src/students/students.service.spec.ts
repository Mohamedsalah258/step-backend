import { StudentsService } from './students.service'
import type { ListStudentsQueryDto } from './dto/list-students-query.dto'

function makeQueryBuilder() {
  return {
    leftJoin: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  }
}

describe('StudentsService#list', () => {
  let service: StudentsService
  let studentsRepo: { createQueryBuilder: jest.Mock; count: jest.Mock }
  let qb: ReturnType<typeof makeQueryBuilder>

  beforeEach(() => {
    qb = makeQueryBuilder()
    studentsRepo = {
      createQueryBuilder: jest.fn(() => qb),
      count: jest.fn().mockResolvedValue(0),
    }
    const subscriptionsRepo = { count: jest.fn().mockResolvedValue(0) }

    service = new StudentsService(
      studentsRepo as never,
      {} as never,
      subscriptionsRepo as never,
      {} as never,
      {} as never,
      {} as never,
    )
  })

  it('joins the subscription course so academic columns are queryable', async () => {
    await service.list({} as ListStudentsQueryDto)

    expect(qb.leftJoin).toHaveBeenCalledWith('student.subscriptions', 'sub')
    expect(qb.leftJoin).toHaveBeenCalledWith('sub.course', 'course')
  })

  it('does not add any academic filter when none is provided', async () => {
    await service.list({} as ListStudentsQueryDto)

    expect(qb.andWhere).not.toHaveBeenCalled()
  })

  it('filters by courseId with an exact match on the subscription FK', async () => {
    await service.list({ courseId: 'course-1' } as ListStudentsQueryDto)

    expect(qb.andWhere).toHaveBeenCalledWith('sub."courseId" = :courseId', {
      courseId: 'course-1',
    })
  })

  it('filters by universityId/collegeId/specializationId via the joined course', async () => {
    await service.list({
      universityId: 'uni-1',
      collegeId: 'college-1',
      specializationId: 'spec-1',
    } as ListStudentsQueryDto)

    expect(qb.andWhere).toHaveBeenCalledWith('course."universityId" = :universityId', {
      universityId: 'uni-1',
    })
    expect(qb.andWhere).toHaveBeenCalledWith('course."collegeId" = :collegeId', {
      collegeId: 'college-1',
    })
    expect(qb.andWhere).toHaveBeenCalledWith('course."specializationId" = :specializationId', {
      specializationId: 'spec-1',
    })
  })

  it('keeps the existing free-text course name filter working alongside courseId', async () => {
    await service.list({ course: 'رياضيات' } as ListStudentsQueryDto)

    expect(qb.andWhere).toHaveBeenCalledWith('sub.courseName ILIKE :course', {
      course: '%رياضيات%',
    })
  })
})
