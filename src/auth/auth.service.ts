import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { Admin } from '../database/entities/admin.entity'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { UpdateMeDto } from './dto/update-me.dto'
import { ChangePasswordDto } from './dto/change-password.dto'

const SALT_ROUNDS = 10

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private signToken(admin: Admin) {
    const payload = { sub: admin.id, email: admin.email, name: admin.name }
    return this.jwtService.sign(payload)
  }

  private toPublicAdmin(admin: Admin) {
    return { id: admin.id, email: admin.email, name: admin.name, avatarFileId: admin.avatarFileId }
  }

  async register(dto: RegisterDto) {
    const expectedInvite = this.configService.get<string>('ADMIN_INVITE_CODE')
    if (!expectedInvite || dto.inviteCode !== expectedInvite) {
      throw new BadRequestException('كود الدعوة غير صحيح')
    }

    const existing = await this.adminsRepository.findOne({
      where: { email: dto.email },
    })
    if (existing) {
      throw new ConflictException('البريد الإلكتروني مستخدم بالفعل')
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS)
    const admin = await this.adminsRepository.save(
      this.adminsRepository.create({
        email: dto.email,
        passwordHash,
        name: dto.name,
      }),
    )

    return {
      accessToken: this.signToken(admin),
      admin: this.toPublicAdmin(admin),
    }
  }

  async login(dto: LoginDto) {
    const admin = await this.adminsRepository.findOne({
      where: { email: dto.email },
    })
    if (!admin) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }

    const passwordMatches = await bcrypt.compare(dto.password, admin.passwordHash)
    if (!passwordMatches) {
      throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }

    return {
      accessToken: this.signToken(admin),
      admin: this.toPublicAdmin(admin),
    }
  }

  async me(adminId: string) {
    const admin = await this.adminsRepository.findOne({
      where: { id: adminId },
    })
    if (!admin) {
      throw new UnauthorizedException('الحساب غير موجود')
    }
    return this.toPublicAdmin(admin)
  }

  async updateMe(adminId: string, dto: UpdateMeDto) {
    const admin = await this.adminsRepository.findOne({ where: { id: adminId } })
    if (!admin) throw new UnauthorizedException('الحساب غير موجود')

    if (dto.email && dto.email !== admin.email) {
      const existing = await this.adminsRepository.findOne({ where: { email: dto.email } })
      if (existing) throw new ConflictException('البريد الإلكتروني مستخدم بالفعل')
    }

    if (dto.name) admin.name = dto.name
    if (dto.email) admin.email = dto.email
    if (dto.avatarFileId) admin.avatarFileId = dto.avatarFileId
    await this.adminsRepository.save(admin)
    return this.toPublicAdmin(admin)
  }

  async changePassword(adminId: string, dto: ChangePasswordDto) {
    const admin = await this.adminsRepository.findOne({ where: { id: adminId } })
    if (!admin) throw new UnauthorizedException('الحساب غير موجود')

    const matches = await bcrypt.compare(dto.currentPassword, admin.passwordHash)
    if (!matches) throw new BadRequestException('كلمة المرور الحالية غير صحيحة')

    admin.passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS)
    await this.adminsRepository.save(admin)
    return { ok: true }
  }
}
