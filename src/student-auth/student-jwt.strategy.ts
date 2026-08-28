import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { InjectRepository } from '@nestjs/typeorm'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { Repository } from 'typeorm'
import { Student, StudentStatus } from '../database/entities/student.entity'

export type StudentJwtPayload = {
  sub: string
  email: string
  name: string
  type: 'student'
}

/**
 * استراتيجية JWT منفصلة تمامًا عن استراتيجية الأدمن (اسمها 'jwt') — عشان
 * توكن أدمن ميقدرش يستخدم أي endpoint خاص بالطالب والعكس. مسجّلة باسم
 * صريح 'student-jwt' (شوف StudentJwtAuthGuard).
 */
@Injectable()
export class StudentJwtStrategy extends PassportStrategy(Strategy, 'student-jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
    })
  }

  async validate(payload: StudentJwtPayload): Promise<StudentJwtPayload> {
    if (payload.type !== 'student') {
      throw new UnauthorizedException('توكن غير صالح')
    }
    const student = await this.studentsRepository.findOne({ where: { id: payload.sub } })
    if (!student) {
      throw new UnauthorizedException('الحساب غير موجود')
    }
    if (student.status === StudentStatus.BANNED) {
      throw new UnauthorizedException('الحساب محظور')
    }
    return { sub: student.id, email: student.email, name: student.name, type: 'student' }
  }
}
