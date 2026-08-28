import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from '../database/entities/student.entity'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { PendingStudentRegistration } from '../database/entities/pending-student-registration.entity'
import { MailModule } from '../mail/mail.module'
import { ProfileLockModule } from '../profile-lock/profile-lock.module'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { StudentAuthController } from './student-auth.controller'
import { StudentAuthService } from './student-auth.service'
import { StudentJwtStrategy } from './student-jwt.strategy'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Student,
      University,
      College,
      Specialization,
      Stage,
      Term,
      PendingStudentRegistration,
    ]),
    MailModule,
    ProfileLockModule,
    MaintenanceModule,
    PassportModule.register({ defaultStrategy: 'student-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') ?? '7d'
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'dev-secret',
          signOptions: { expiresIn: expiresIn as unknown as number },
        }
      },
    }),
  ],
  controllers: [StudentAuthController],
  providers: [StudentAuthService, StudentJwtStrategy],
  exports: [StudentAuthService],
})
export class StudentAuthModule {}
