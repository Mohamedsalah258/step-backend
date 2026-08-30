import { ReportsService } from './reports.service'
import type { ReportsQueryDto } from './dto/reports-query.dto'

// report-export.util pulls in puppeteer (ESM-only), which Jest can't transform.
// A factory mock avoids Jest ever loading the real module (an automock still
// would, to introspect its shape) — these tests never call the export methods.
jest.mock('./report-export.util', () => ({
  buildCsv: jest.fn(),
  buildXlsx: jest.fn(),
  buildPdf: jest.fn(),
}))

function makeQueryBuilder() {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }
}

describe('ReportsService academic filters', () => {
  let service: ReportsService
  let purchaseRequestsRepo: { createQueryBuilder: jest.Mock }
  let subscriptionsRepo: { createQueryBuilder: jest.Mock; count: jest.Mock }
  let studentsRepo: { count: jest.Mock }
  let resetLogsRepo: { count: jest.Mock }
  let ordersQb: ReturnType<typeof makeQueryBuilder>
  let subsQb: ReturnType<typeof makeQueryBuilder>

  const query: ReportsQueryDto = {
    universityId: 'uni-1',
    collegeId: 'college-1',
    specializationId: 'spec-1',
  } as ReportsQueryDto

  beforeEach(() => {
    ordersQb = makeQueryBuilder()
    subsQb = makeQueryBuilder()
    purchaseRequestsRepo = { createQueryBuilder: jest.fn(() => ordersQb) }
    subscriptionsRepo = {
      createQueryBuilder: jest.fn(() => subsQb),
      count: jest.fn().mockResolvedValue(0),
    }
    studentsRepo = { count: jest.fn().mockResolvedValue(0) }
    resetLogsRepo = { count: jest.fn().mockResolvedValue(0) }

    service = new ReportsService(
      purchaseRequestsRepo as never,
      subscriptionsRepo as never,
      studentsRepo as never,
      resetLogsRepo as never,
    )
  })

  it('revenue(): applies the academic filter on the joined course alias', async () => {
    await service.revenue(query)

    expect(ordersQb.andWhere).toHaveBeenCalledWith('course."universityId" = :universityId', {
      universityId: 'uni-1',
    })
    expect(ordersQb.andWhere).toHaveBeenCalledWith('course."collegeId" = :collegeId', {
      collegeId: 'college-1',
    })
    expect(ordersQb.andWhere).toHaveBeenCalledWith(
      'course."specializationId" = :specializationId',
      { specializationId: 'spec-1' },
    )
  })

  it('revenue(): adds no academic filter when params are absent', async () => {
    await service.revenue({} as ReportsQueryDto)

    expect(ordersQb.andWhere).toHaveBeenCalledTimes(1) // only the createdAt range
  })

  it('students(): applies the academic filter on the joined subscription course', async () => {
    await service.students(query)

    expect(subsQb.andWhere).toHaveBeenCalledWith('course."universityId" = :universityId', {
      universityId: 'uni-1',
    })
    expect(subsQb.andWhere).toHaveBeenCalledWith('course."collegeId" = :collegeId', {
      collegeId: 'college-1',
    })
  })

  it('orders(): applies the academic filter on the joined course', async () => {
    await service.orders(query)

    expect(ordersQb.andWhere).toHaveBeenCalledWith(
      'course."specializationId" = :specializationId',
      { specializationId: 'spec-1' },
    )
  })
})
