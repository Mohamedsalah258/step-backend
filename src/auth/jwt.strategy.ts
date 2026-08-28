import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { InjectRepository } from '@nestjs/typeorm'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Repository } from 'typeorm'
import { Admin } from '../database/entities/admin.entity'

export type JwtPayload = {
  sub: string
  email: string
  name: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
    })
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    // بنتأكد إن الأدمن لسه موجود (مثلاً متحذفش) قبل ما نسمح بالطلب.
    const admin = await this.adminsRepository.findOne({
      where: { id: payload.sub },
    })
    if (!admin) {
      throw new UnauthorizedException('الحساب غير موجود')
    }
    return { sub: admin.id, email: admin.email, name: admin.name }
  }
}
