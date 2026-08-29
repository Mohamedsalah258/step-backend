import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PoliciesService } from './policies.service'
import { Policy } from '../database/entities/policy.entity'
import { PolicyType } from '../database/entities/policy-type.enum'

const ADMIN = { sub: 'admin-1', email: 'a@a.com', name: 'الأدمن' }

describe('PoliciesService', () => {
  let service: PoliciesService
  let policiesRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock }

  beforeEach(async () => {
    policiesRepo = {
      findOne: jest.fn(),
      create: jest.fn((v) => v),
      save: jest.fn().mockImplementation((v) =>
        Promise.resolve({ id: 'p1', updatedAt: new Date('2026-01-01T00:00:00.000Z'), ...v }),
      ),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [PoliciesService, { provide: getRepositoryToken(Policy), useValue: policiesRepo }],
    }).compile()

    service = module.get(PoliciesService)
  })

  describe('getByType', () => {
    it('بيرجع الصف الموجود من غير أي تعديل لو موجود بالفعل', async () => {
      policiesRepo.findOne.mockResolvedValue({
        type: PolicyType.PRIVACY,
        heading: 'عنوان محفوظ',
        content: 'محتوى محفوظ',
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedByAdminName: 'د. الحسن',
      })

      const result = await service.getByType(PolicyType.PRIVACY)

      expect(policiesRepo.save).not.toHaveBeenCalled()
      expect(result.heading).toBe('عنوان محفوظ')
    })

    it('لو الصفحة لسه ما اتكتبتش، بيعمل صف افتراضي تلقائي بدل ما يرمي 404', async () => {
      policiesRepo.findOne.mockResolvedValue(null)

      const result = await service.getByType(PolicyType.PRIVACY)

      expect(policiesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ type: PolicyType.PRIVACY, heading: 'سياسة الخصوصية' }),
      )
      expect(result.heading).toBe('سياسة الخصوصية')
    })
  })

  describe('update', () => {
    it('لو الصفحة مش موجودة أصلاً، بينشئها بالمحتوى الجديد بدل ما يرمي 404', async () => {
      policiesRepo.findOne.mockResolvedValue(null)

      const result = await service.update(
        PolicyType.TERMS,
        { heading: 'شروط جديدة', content: 'نص جديد' },
        ADMIN,
      )

      expect(result).toEqual({ ok: true })
      expect(policiesRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ heading: 'شروط جديدة', content: 'نص جديد', updatedByAdminName: 'الأدمن' }),
      )
    })
  })
})
