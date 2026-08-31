import { NotFoundException } from '@nestjs/common'
import { ContactSupportService } from './contact-support.service'

const ADMIN = { sub: 'admin-1', email: 'a@a.com', name: 'الأدمن' }

describe('ContactSupportService#reply', () => {
  let service: ContactSupportService
  let repo: { findOne: jest.Mock; update: jest.Mock }
  let mailService: { sendContactSupportReply: jest.Mock }

  beforeEach(() => {
    repo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'msg-1',
        name: 'زائر',
        emailForReply: 'visitor@x.com',
        message: 'نسيت الباسورد',
      }),
      update: jest.fn().mockResolvedValue(undefined),
    }
    mailService = { sendContactSupportReply: jest.fn().mockResolvedValue(undefined) }

    service = new ContactSupportService(repo as never, mailService as never)
  })

  it('sends the reply email to the original sender with the original message for context', async () => {
    await service.reply('msg-1', { message: 'اتبعتلك رابط إعادة التعيين' }, ADMIN)

    expect(mailService.sendContactSupportReply).toHaveBeenCalledWith(
      'visitor@x.com',
      'زائر',
      'نسيت الباسورد',
      'اتبعتلك رابط إعادة التعيين',
    )
  })

  it('records the reply, timestamp, and replying admin on the message row', async () => {
    await service.reply('msg-1', { message: 'اتبعتلك رابط إعادة التعيين' }, ADMIN)

    expect(repo.update).toHaveBeenCalledWith(
      'msg-1',
      expect.objectContaining({
        replyMessage: 'اتبعتلك رابط إعادة التعيين',
        repliedByAdminName: 'الأدمن',
        repliedAt: expect.any(Date),
      }),
    )
  })

  it('throws NotFoundException for a message that does not exist', async () => {
    repo.findOne.mockResolvedValue(null)

    await expect(service.reply('missing', { message: 'رد' }, ADMIN)).rejects.toThrow(NotFoundException)
    expect(mailService.sendContactSupportReply).not.toHaveBeenCalled()
  })
})
