import { Body, Controller, Get, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { CurrentAdmin } from './current-admin.decorator'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import type { JwtPayload } from './jwt.strategy'
import { Public } from './public.decorator'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentAdmin() admin: JwtPayload) {
    return this.authService.me(admin.sub)
  }

  @ApiBearerAuth()
  @Patch('me')
  updateMe(@Body() dto: UpdateMeDto, @CurrentAdmin() admin: JwtPayload) {
    return this.authService.updateMe(admin.sub, dto)
  }

  @ApiBearerAuth()
  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto, @CurrentAdmin() admin: JwtPayload) {
    return this.authService.changePassword(admin.sub, dto)
  }
}
