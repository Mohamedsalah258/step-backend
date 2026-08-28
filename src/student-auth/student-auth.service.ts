import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { PendingStudentRegistration } from '../database/entities/pending-student-registration.entity'
import { AppException } from '../common/exceptions/app-exception'
import { ErrorCode } from '../common/exceptions/error-code.enum'
import { MailService } from '../mail/mail.service'
import { ProfileLockService } from '../profile-lock/profile-lock.service'
import { RegisterStudentDto } from './dto/register-student.dto'
import { LoginStudentDto } from './dto/login-student.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto'
import type { StudentJwtPayload } from './student-jwt.strategy'

const SALT_ROUNDS = 10
const OTP_TTL_MINUTES = 10
const OTP_MAX_ATTEMPTS = 5
const RESET_TOKEN_TTL = '10m'

type PasswordResetTokenPayload = { sub: string; type: 'password-reset' }

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

@Injectable()
export class StudentAuthService {
  constructor(
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(University) private universitiesRepo: Repository<University>,
    @InjectRepository(College) private collegesRepo: Repository<College>,
    @InjectRepository(Specialization) private specializationsRepo: Repository<Specialization>,
    @InjectRepository(Stage) private stagesRepo: Repository<Stage>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(PendingStudentRegistration)
    private pendingRegRepo: Repository<PendingStudentRegistration>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly profileLockService: ProfileLockService,
  ) {}

  private signToken(student: Student): string {
    const payload: StudentJwtPayload = {
      sub: student.id,
      email: student.email,
      name: student.name,
      type: 'student',
    }
    return this.jwtService.sign(payload)
  }

  private async toPublicStudent(student: Student) {
    const academicEditLocked = await this.profileLockService.isLockedForStudent(student)
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      universityId: student.universityId,
      collegeId: student.collegeId,
      specializationId: student.specializationId,
      stageId: student.stageId,
      termId: student.termId,
      deviceModel: student.deviceModel,
      /** لو true، الفرونت يقفل حقول المستوى/الترم في شاشة تعديل البروفايل */
      academicEditLocked,
    }
  }

  /**
   * الخطوة الأولى بس — بتتحقق من صحة البيانات وتبعت كود تحقق بالإيميل،
   * من غير ما تعمل create للحساب الحقيقي. لو نفس الإيميل طلب تسجيل قبل
   * كده وما أكدش، الطلب الجديد بيستبدل القديم (upsert) — نفس فكرة "إعادة
   * الإرسال". الحساب الفعلي بيتعمله create بس بعد التأكيد
   * (شوف verifyRegistrationOtp).
   */
  async register(dto: RegisterStudentDto): Promise<{ ok: true }> {
    const existing = await this.studentsRepo.findOne({ where: { email: dto.email } })
    if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل')

    await this.mustDeviceBeFree(dto.deviceIdentifier)

    await Promise.all([
      this.mustExist(this.universitiesRepo, dto.universityId, 'الجامعة غير موجودة'),
      this.mustExist(this.collegesRepo, dto.collegeId, 'الكلية غير موجودة'),
      this.mustExist(this.specializationsRepo, dto.specializationId, 'التخصص غير موجود'),
      this.mustExist(this.stagesRepo, dto.stageId, 'المرحلة غير موجودة'),
    ])

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)
    const otp = generateOtp()
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS)

    const pending =
      (await this.pendingRegRepo.findOne({ where: { email: dto.email } })) ??
      this.pendingRegRepo.create({ email: dto.email })
    pending.name = dto.name
    pending.phone = dto.phone
    pending.passwordHash = passwordHash
    pending.universityId = dto.universityId
    pending.collegeId = dto.collegeId
    pending.specializationId = dto.specializationId
    pending.stageId = dto.stageId
    pending.deviceIdentifier = dto.deviceIdentifier
    pending.deviceModel = dto.deviceModel ?? null
    pending.otpHash = otpHash
    pending.otpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000)
    pending.otpAttempts = 0
    await this.pendingRegRepo.save(pending)

    await this.mailService.sendOtpEmail(dto.email, dto.name, otp)
    return { ok: true }
  }

  /**
   * الخطوة الثانية — بتأكد الكود وتعمل create للحساب الحقيقي فعليًا.
   * بتعيد فحص الإيميل والجهاز تاني (مش بس اللي حصل وقت register) عشان
   * تمنع أي race لو حصل تسجيل تاني بنفس الإيميل/الجهاز في الوقت بين
   * الطلبين.
   */
  async verifyRegistrationOtp(dto: VerifyOtpDto) {
    const invalid = () =>
      new AppException(ErrorCode.UNAUTHORIZED, 'الكود غير صحيح أو منتهي الصلاحية', undefined, HttpStatus.UNAUTHORIZED)

    const pending = await this.pendingRegRepo.findOne({ where: { email: dto.email } })
    if (!pending) throw invalid()
    if (pending.otpExpiresAt.getTime() < Date.now()) throw invalid()
    if (pending.otpAttempts >= OTP_MAX_ATTEMPTS) throw invalid()

    const matches = await bcrypt.compare(dto.otp, pending.otpHash)
    if (!matches) {
      pending.otpAttempts += 1
      await this.pendingRegRepo.save(pending)
      throw invalid()
    }

    const existing = await this.studentsRepo.findOne({ where: { email: pending.email } })
    if (existing) {
      await this.pendingRegRepo.remove(pending)
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل')
    }
    await this.mustDeviceBeFree(pending.deviceIdentifier, pending)

    const student = await this.studentsRepo.save(
      this.studentsRepo.create({
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        passwordHash: pending.passwordHash,
        universityId: pending.universityId,
        collegeId: pending.collegeId,
        specializationId: pending.specializationId,
        stageId: pending.stageId,
        deviceIdentifier: pending.deviceIdentifier,
        deviceModel: pending.deviceModel,
        status: StudentStatus.ACTIVE,
      }),
    )
    await this.pendingRegRepo.remove(pending)

    return { accessToken: this.signToken(student), student: await this.toPublicStudent(student) }
  }

  /**
   * تسجيل الدخول — بيتحقق من الباسورد، وبعدين بيطبّق سياسة "جهاز واحد بس":
   * أول تسجيل دخول (أو أول مرة بعد ما الأدمن يعمل ريست) بيربط الحساب
   * بالجهاز اللي بعت الطلب، وأي محاولة بعد كده من جهاز مختلف بترفض.
   */
  async login(dto: LoginStudentDto) {
    const student = await this.studentsRepo.findOne({ where: { email: dto.email } })
    if (!student || !student.passwordHash) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }

    const matches = await bcrypt.compare(dto.password, student.passwordHash)
    if (!matches) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }

    if (student.status === StudentStatus.BANNED) {
      throw new AppException(
        ErrorCode.ACCOUNT_BANNED,
        'الحساب محظور — تواصل مع الدعم لمعرفة التفاصيل',
        undefined,
        HttpStatus.FORBIDDEN,
      )
    }

    if (student.deviceIdentifier && student.deviceIdentifier !== dto.deviceIdentifier) {
      throw new AppException(
        ErrorCode.DEVICE_MISMATCH,
        'الحساب مربوط بجهاز تاني — تواصل مع الدعم لتغيير الجهاز',
        undefined,
        HttpStatus.FORBIDDEN,
      )
    }

    if (!student.deviceIdentifier) {
      student.deviceIdentifier = dto.deviceIdentifier
      student.deviceModel = dto.deviceModel ?? student.deviceModel
      await this.studentsRepo.save(student)
    }

    return { accessToken: this.signToken(student), student: await this.toPublicStudent(student) }
  }

  async me(studentId: string) {
    const student = await this.studentsRepo.findOne({ where: { id: studentId } })
    if (!student) throw new NotFoundException('الحساب غير موجود')
    return this.toPublicStudent(student)
  }

  /**
   * تعديل البروفايل — الحقول العادية (الاسم/التليفون/الجامعة/الكلية/التخصص)
   * متاحة دايمًا. المستوى والترم بس هما المحكومين بقفل تعديل البيانات
   * الأكاديمية (شوف ProfileLockService) — لو مقفول ومفيش استثناء للطالب،
   * الطلب كله بيترفض بدل ما يتجاهل الحقلين دول بصمت.
   */
  async updateProfile(studentId: string, dto: UpdateStudentProfileDto) {
    const student = await this.studentsRepo.findOne({ where: { id: studentId } })
    if (!student) throw new NotFoundException('الحساب غير موجود')

    const touchesAcademicFields = dto.stageId !== undefined || dto.termId !== undefined
    if (touchesAcademicFields && (await this.profileLockService.isLockedForStudent(student))) {
      throw new AppException(
        ErrorCode.PROFILE_EDIT_LOCKED,
        'تعديل المستوى والترم مقفول حاليًا — تواصل مع الدعم لو محتاج تعديل',
        undefined,
        HttpStatus.FORBIDDEN,
      )
    }

    if (dto.universityId !== undefined) {
      await this.mustExist(this.universitiesRepo, dto.universityId, 'الجامعة غير موجودة')
    }
    if (dto.collegeId !== undefined) {
      await this.mustExist(this.collegesRepo, dto.collegeId, 'الكلية غير موجودة')
    }
    if (dto.specializationId !== undefined) {
      await this.mustExist(this.specializationsRepo, dto.specializationId, 'التخصص غير موجود')
    }
    if (dto.stageId !== undefined) {
      await this.mustExist(this.stagesRepo, dto.stageId, 'المرحلة غير موجودة')
    }
    if (dto.termId !== undefined) {
      const term = await this.termsRepo.findOne({ where: { id: dto.termId } })
      if (!term) throw new NotFoundException('الترم غير موجود')
      const effectiveStageId = dto.stageId ?? student.stageId
      if (effectiveStageId && term.stageId !== effectiveStageId) {
        throw new BadRequestException('الترم المختار مش تابع للمستوى الحالي')
      }
    }

    if (dto.name !== undefined) student.name = dto.name
    if (dto.phone !== undefined) student.phone = dto.phone
    if (dto.universityId !== undefined) student.universityId = dto.universityId
    if (dto.collegeId !== undefined) student.collegeId = dto.collegeId
    if (dto.specializationId !== undefined) student.specializationId = dto.specializationId
    if (dto.stageId !== undefined) student.stageId = dto.stageId
    if (dto.termId !== undefined) student.termId = dto.termId

    await this.studentsRepo.save(student)
    return this.toPublicStudent(student)
  }

  /**
   * دايمًا بترجع نجاح بغض النظر إن كان الإيميل موجود ولا لأ — عشان محدش
   * يقدر يستخدم الـ endpoint ده يتأكد إن إيميل معيّن مسجّل عندنا ولا لأ.
   * لو الإيميل فعلاً موجود، بيتولّد كود ويتبعت. لو إرسال الإيميل نفسه فشل
   * (SMTP غلط مثلًا)، بنرمي خطأ حقيقي — عشان وقت الإعداد/الاختبار تعرف
   * إن فيه مشكلة حقيقية بدل ما تفتكر إنه اتبعت وهو مش اتبعت.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ ok: true }> {
    const student = await this.studentsRepo.findOne({ where: { email: dto.email } })
    if (!student) return { ok: true }

    const otp = generateOtp()
    student.resetOtpHash = await bcrypt.hash(otp, SALT_ROUNDS)
    student.resetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000)
    student.resetOtpAttempts = 0
    await this.studentsRepo.save(student)

    await this.mailService.sendOtpEmail(student.email, student.name, otp)
    return { ok: true }
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const invalid = () =>
      new AppException(ErrorCode.UNAUTHORIZED, 'الكود غير صحيح أو منتهي الصلاحية', undefined, HttpStatus.UNAUTHORIZED)

    const student = await this.studentsRepo.findOne({ where: { email: dto.email } })
    if (!student || !student.resetOtpHash || !student.resetOtpExpiresAt) throw invalid()
    if (student.resetOtpExpiresAt.getTime() < Date.now()) throw invalid()
    if (student.resetOtpAttempts >= OTP_MAX_ATTEMPTS) throw invalid()

    const matches = await bcrypt.compare(dto.otp, student.resetOtpHash)
    if (!matches) {
      student.resetOtpAttempts += 1
      await this.studentsRepo.save(student)
      throw invalid()
    }

    // الكود صالح لمرة واحدة بس — يتشال فورًا عشان محدش يعيد استخدامه.
    student.resetOtpHash = null
    student.resetOtpExpiresAt = null
    student.resetOtpAttempts = 0
    await this.studentsRepo.save(student)

    const payload: PasswordResetTokenPayload = { sub: student.id, type: 'password-reset' }
    const resetToken = this.jwtService.sign(payload, { expiresIn: RESET_TOKEN_TTL })
    return { resetToken }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ ok: true }> {
    let payload: PasswordResetTokenPayload
    try {
      payload = this.jwtService.verify<PasswordResetTokenPayload>(dto.resetToken)
    } catch {
      throw new UnauthorizedException('انتهت صلاحية الطلب — ابدأ من جديد')
    }
    if (payload.type !== 'password-reset') {
      throw new UnauthorizedException('توكن غير صالح')
    }

    const student = await this.studentsRepo.findOne({ where: { id: payload.sub } })
    if (!student) throw new NotFoundException('الحساب غير موجود')

    student.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)
    await this.studentsRepo.save(student)
    return { ok: true }
  }

  private async mustExist<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    message: string,
  ): Promise<void> {
    const found = await repo.findOne({ where: { id } as never })
    if (!found) throw new NotFoundException(message)
  }

  /** بيمنع تسجيل حساب جديد من جهاز مرتبط بحساب طالب حقيقي تاني بالفعل —
   * سياسة "جهاز واحد بس" لازم تتطبق وقت التسجيل مش بس وقت تسجيل الدخول. */
  private async mustDeviceBeFree(
    deviceIdentifier: string,
    pendingToCleanup?: PendingStudentRegistration,
  ): Promise<void> {
    const deviceTaken = await this.studentsRepo.findOne({ where: { deviceIdentifier } })
    if (deviceTaken) {
      if (pendingToCleanup) await this.pendingRegRepo.remove(pendingToCleanup)
      throw new AppException(
        ErrorCode.DEVICE_ALREADY_REGISTERED,
        'الجهاز ده مرتبط بحساب طالب تاني بالفعل — تواصل مع الدعم لو محتاج مساعدة',
        undefined,
        HttpStatus.CONFLICT,
      )
    }
  }
}
