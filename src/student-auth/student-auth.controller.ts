import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentAuthService } from './student-auth.service'
import { CurrentStudent } from './current-student.decorator'
import { StudentJwtAuthGuard } from './student-jwt-auth.guard'
import { RegisterStudentDto } from './dto/register-student.dto'
import { LoginStudentDto } from './dto/login-student.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto'
import type { StudentJwtPayload } from './student-jwt.strategy'

/** كل الـ routes هنا خاصة بالطالب — لازم تتقفل وقت وضع الصيانة (عكس
 * routes الأدمن اللي مالهاش دعوة بالحارس ده خالص، شوف MaintenanceGuard). */
@UseGuards(MaintenanceGuard)
@ApiTags('student-auth')
@Controller('student-auth')
export class StudentAuthController {
  constructor(private readonly studentAuthService: StudentAuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterStudentDto) {
    return this.studentAuthService.register(dto)
  }

  @Public()
  @Post('verify-registration-otp')
  verifyRegistrationOtp(@Body() dto: VerifyOtpDto) {
    return this.studentAuthService.verifyRegistrationOtp(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginStudentDto) {
    return this.studentAuthService.login(dto)
  }

  @Public()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.studentAuthService.forgotPassword(dto)
  }

  @Public()
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.studentAuthService.verifyOtp(dto)
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.studentAuthService.resetPassword(dto)
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(StudentJwtAuthGuard)
  @Get('me')
  me(@CurrentStudent() student: StudentJwtPayload) {
    return this.studentAuthService.me(student.sub)
  }

  @Public()
  @ApiBearerAuth()
  @UseGuards(StudentJwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Body() dto: UpdateStudentProfileDto,
    @CurrentStudent() student: StudentJwtPayload,
  ) {
    return this.studentAuthService.updateProfile(student.sub, dto)
  }
}
