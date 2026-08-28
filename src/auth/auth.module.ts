import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Admin } from '../database/entities/admin.entity'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        // expiresIn بيقبل string ("7d", "1h"...) فعليًا وقت التشغيل، بس النوع
        // في @nestjs/jwt ضيق أكتر من كده — الـ cast هنا آمن لأن القيمة
        // جايه من .env كنص زمن قياسي (راجع JWT_EXPIRES_IN في .env.example).
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') ?? '7d'
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
          signOptions: {
            expiresIn: expiresIn as unknown as number,
          },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
