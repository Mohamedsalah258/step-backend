import { TicketsService } from './tickets.service'
import { SupportTicketStatus } from '../database/entities/support-ticket-status.enum'
import { SupportTicketPriority } from '../database/entities/support-ticket-priority.enum'
import type { ListTicketsQueryDto } from './dto/list-tickets-query.dto'

function makeTicketQueryBuilder(rows: unknown[], count: number) {
  return {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(count),
    getMany: jest.fn().mockResolvedValue(rows),
  }
}

function makeTicket(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'ticket-1',
    subject: 'مشكلة في التطبيق',
    student: { id: 'student-1', name: 'أحمد', email: 'ahmed@x.com' },
    category: null,
    priority: SupportTicketPriority.MEDIUM,
    status: SupportTicketStatus.OPEN,
    assignedAdminName: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    ...overrides,
  }
}

function makeGuestMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'guest-1',
    name: null,
    emailForReply: 'visitor@x.com',
    message: 'نسيت الباسورد',
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
    ...overrides,
  }
}

describe('TicketsService#list — merged guest contact rows', () => {
  let service: TicketsService
  let ticketsRepo: { createQueryBuilder: jest.Mock; count: jest.Mock }
  let contactSupportRepo: { createQueryBuilder: jest.Mock; count: jest.Mock }
  let ticketQb: ReturnType<typeof makeTicketQueryBuilder>
  let guestQb: ReturnType<typeof makeTicketQueryBuilder>

  function build(ticketRows: unknown[], ticketCount: number, guestRows: unknown[], guestCount: number) {
    ticketQb = makeTicketQueryBuilder(ticketRows, ticketCount)
    guestQb = makeTicketQueryBuilder(guestRows, guestCount)
    ticketsRepo = {
      createQueryBuilder: jest.fn(() => ticketQb),
      count: jest.fn().mockResolvedValue(0),
    }
    contactSupportRepo = {
      createQueryBuilder: jest.fn(() => guestQb),
      count: jest.fn().mockResolvedValue(guestCount),
    }

    service = new TicketsService(
      ticketsRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      contactSupportRepo as never,
      {} as never,
      {} as never,
    )
  }

  it('tags rows with the right kind and sorts the merged list by recency', async () => {
    build([makeTicket()], 1, [makeGuestMessage()], 1)

    const result = await service.list({ page: 1, limit: 10 } as ListTicketsQueryDto)

    expect(result.data).toHaveLength(2)
    // guest message (2026-01-10) is more recent than the ticket's updatedAt (2026-01-05)
    expect((result.data[0] as { kind: string }).kind).toBe('GUEST_CONTACT')
    expect((result.data[1] as { kind: string }).kind).toBe('STUDENT_TICKET')
  })

  it('falls back the guest "student" name to the reply email when no name was given', async () => {
    build([], 0, [makeGuestMessage({ name: null, emailForReply: 'visitor@x.com' })], 1)

    const result = await service.list({ page: 1, limit: 10 } as ListTicketsQueryDto)

    expect(result.data[0]).toMatchObject({
      kind: 'GUEST_CONTACT',
      student: { id: null, name: 'visitor@x.com', email: 'visitor@x.com' },
    })
  })

  it('uses the given name over the email when present', async () => {
    build([], 0, [makeGuestMessage({ name: 'سارة' })], 1)

    const result = await service.list({ page: 1, limit: 10 } as ListTicketsQueryDto)

    expect(result.data[0]).toMatchObject({ student: { name: 'سارة' } })
  })

  it('excludes guest rows when a status tab other than "all" is requested', async () => {
    build([makeTicket()], 1, [makeGuestMessage()], 1)

    const result = await service.list({ page: 1, limit: 10, tab: 'open' } as ListTicketsQueryDto)

    expect(contactSupportRepo.createQueryBuilder).not.toHaveBeenCalled()
    expect(result.data.every((r) => (r as { kind: string }).kind === 'STUDENT_TICKET')).toBe(true)
  })

  it('excludes guest rows when a ticket-only filter (priority/category/assignedAdminId) is set', async () => {
    build([makeTicket()], 1, [makeGuestMessage()], 1)

    await service.list({ page: 1, limit: 10, priority: SupportTicketPriority.HIGH } as ListTicketsQueryDto)
    expect(contactSupportRepo.createQueryBuilder).not.toHaveBeenCalled()

    await service.list({ page: 1, limit: 10, categoryId: 'cat-1' } as ListTicketsQueryDto)
    expect(contactSupportRepo.createQueryBuilder).not.toHaveBeenCalled()

    await service.list({ page: 1, limit: 10, assignedAdminId: 'admin-1' } as ListTicketsQueryDto)
    expect(contactSupportRepo.createQueryBuilder).not.toHaveBeenCalled()
  })

  it('folds the unfiltered guest total into the "all" tab count, leaving status tabs ticket-only', async () => {
    build([], 0, [], 0)
    contactSupportRepo.count = jest.fn().mockResolvedValue(7)
    ticketsRepo.count = jest.fn().mockResolvedValue(3)

    const result = await service.list({ page: 1, limit: 10 } as ListTicketsQueryDto)

    expect((result.meta.tabs as { all: number }).all).toBe(10)
  })
})
