import * as bcrypt from 'bcrypt'
import { StudentAuthService } from './student-auth.service'
import { StudentStatus } from '../database/entities/student.entity'
import { AppException } from '../common/exceptions/app-exception'
import type { LoginStudentDto } from './dto/login-student.dto'

function makeService(studentsRepo: { findOne: jest.Mock; save: jest.Mock }) {
  const jwtService = { sign: jest.fn().mockReturnValue('signed-token') }
  const profileLockService = { isLockedForStudent: jest.fn().mockResolvedValue(false) }

  const service = new StudentAuthService(
    studentsRepo as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    jwtService as never,
    {} as never,
    profileLockService as never,
  )
  return { service, jwtService, profileLockService }
}

async function baseStudent(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'student-1',
    email: 'a@a.com',
    passwordHash: await bcrypt.hash('password123', 4),
    status: StudentStatus.ACTIVE,
    deviceIdentifier: null,
    deviceModel: null,
    deviceLockExempt: false,
    name: 'طالب',
    ...overrides,
  }
}

const DTO: LoginStudentDto = {
  email: 'a@a.com',
  password: 'password123',
  deviceIdentifier: 'device-new',
}

describe('StudentAuthService#login — device lock', () => {
  it('بيرفض بـ DEVICE_MISMATCH لو الحساب مربوط بجهاز تاني وغير مستثنى', async () => {
    const student = await baseStudent({ deviceIdentifier: 'device-old', deviceLockExempt: false })
    const studentsRepo = { findOne: jest.fn().mockResolvedValue(student), save: jest.fn() }
    const { service } = makeService(studentsRepo)

    await expect(service.login(DTO)).rejects.toThrow(AppException)
    expect(studentsRepo.save).not.toHaveBeenCalled()
  })

  it('بيسمح بتسجيل الدخول من جهاز مختلف لو الحساب مستثنى (deviceLockExempt)، وبيحدّث الجهاز المخزّن', async () => {
    const student = await baseStudent({ deviceIdentifier: 'device-old', deviceLockExempt: true })
    const studentsRepo = { findOne: jest.fn().mockResolvedValue(student), save: jest.fn() }
    const { service } = makeService(studentsRepo)

    const result = await service.login(DTO)

    expect(result.accessToken).toBe('signed-token')
    expect(studentsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ deviceIdentifier: 'device-new' }),
    )
  })

  it('أول تسجيل دخول (deviceIdentifier=null) بيربط الحساب بالجهاز عادي، مستثنى أو لأ', async () => {
    const student = await baseStudent({ deviceIdentifier: null, deviceLockExempt: false })
    const studentsRepo = { findOne: jest.fn().mockResolvedValue(student), save: jest.fn() }
    const { service } = makeService(studentsRepo)

    await service.login(DTO)

    expect(studentsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ deviceIdentifier: 'device-new' }),
    )
  })

  it('نفس الجهاز المسجّل بالفعل — مبيعملش save زيادة', async () => {
    const student = await baseStudent({ deviceIdentifier: 'device-new', deviceLockExempt: false })
    const studentsRepo = { findOne: jest.fn().mockResolvedValue(student), save: jest.fn() }
    const { service } = makeService(studentsRepo)

    await service.login(DTO)

    expect(studentsRepo.save).not.toHaveBeenCalled()
  })
})
