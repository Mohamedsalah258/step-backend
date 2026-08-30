import { OrdersService } from './orders.service'
import type { ListOrdersQueryDto } from './dto/list-orders-query.dto'

function makeQueryBuilder() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
    getMany: jest.fn().mockResolvedValue([]),
  }
}

describe('OrdersService#list', () => {
  let service: OrdersService
  let ordersRepo: { createQueryBuilder: jest.Mock; count: jest.Mock }
  let qb: ReturnType<typeof makeQueryBuilder>

  beforeEach(() => {
    qb = makeQueryBuilder()
    ordersRepo = {
      createQueryBuilder: jest.fn(() => qb),
      count: jest.fn().mockResolvedValue(0),
    }

    service = new OrdersService(
      ordersRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    )
  })

  it('does not add any academic filter when none is provided', async () => {
    await service.list({} as ListOrdersQueryDto)

    expect(qb.andWhere).not.toHaveBeenCalledWith(
      expect.stringContaining('universityId'),
      expect.anything(),
    )
  })

  it('filters by universityId/collegeId/specializationId on the already-joined course', async () => {
    await service.list({
      universityId: 'uni-1',
      collegeId: 'college-1',
      specializationId: 'spec-1',
    } as ListOrdersQueryDto)

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

  it('keeps the existing exact courseId filter working alongside the new params', async () => {
    await service.list({ courseId: 'course-1' } as ListOrdersQueryDto)

    expect(qb.andWhere).toHaveBeenCalledWith('o."courseId" = :courseId', {
      courseId: 'course-1',
    })
  })
})
