import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from './database/entities/student.entity'
import { ResetLog } from './database/entities/reset-log.entity'
import { Subscription } from './database/entities/subscription.entity'
import { ActivityLog } from './database/entities/activity-log.entity'
import { Admin } from './database/entities/admin.entity'
import { University } from './database/entities/university.entity'
import { College } from './database/entities/college.entity'
import { Specialization } from './database/entities/specialization.entity'
import { Stage } from './database/entities/stage.entity'
import { Term } from './database/entities/term.entity'
import { Course } from './database/entities/course.entity'
import { CourseContentItem } from './database/entities/course-content-item.entity'
import { ContentProgress } from './database/entities/content-progress.entity'
import { UploadedFile } from './database/entities/uploaded-file.entity'
import { PaymentMethod } from './database/entities/payment-method.entity'
import { PurchaseRequest } from './database/entities/purchase-request.entity'
import { Banner } from './database/entities/banner.entity'
import { Policy } from './database/entities/policy.entity'
import { MaintenanceState } from './database/entities/maintenance-state.entity'
import { MaintenanceLog } from './database/entities/maintenance-log.entity'
import { ProfileLockState } from './database/entities/profile-lock-state.entity'
import { PendingStudentRegistration } from './database/entities/pending-student-registration.entity'
import { Notification } from './database/entities/notification.entity'
import { NotificationBatch } from './database/entities/notification-batch.entity'
import { SupportTicket } from './database/entities/support-ticket.entity'
import { SupportTicketMessage } from './database/entities/support-ticket-message.entity'
import { SupportTicketCategory } from './database/entities/support-ticket-category.entity'
import { StudentsModule } from './students/students.module'
import { DashboardModule } from './dashboard/dashboard.module'
import { ActivityLogModule } from './activity-log/activity-log.module'
import { AcademicModule } from './academic/academic.module'
import { CoursesModule } from './courses/courses.module'
import { UploadsModule } from './uploads/uploads.module'
import { PaymentsModule } from './payments/payments.module'
import { OrdersModule } from './orders/orders.module'
import { ReportsModule } from './reports/reports.module'
import { BannersModule } from './banners/banners.module'
import { PoliciesModule } from './policies/policies.module'
import { MaintenanceModule } from './maintenance/maintenance.module'
import { ProfileLockModule } from './profile-lock/profile-lock.module'
import { NotificationsModule } from './notifications/notifications.module'
import { TicketsModule } from './tickets/tickets.module'
import { AuthModule } from './auth/auth.module'
import { StudentAuthModule } from './student-auth/student-auth.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // حد افتراضي عام لكل الـ endpoints — 100 طلب/دقيقة لكل IP. أي endpoint
    // محتاج حد أضيق (زي /notifications/send) بيستخدم @Throttle محلي فوقه.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        Student,
        ResetLog,
        Subscription,
        ActivityLog,
        Admin,
        University,
        College,
        Specialization,
        Stage,
        Term,
        Course,
        CourseContentItem,
        ContentProgress,
        UploadedFile,
        PaymentMethod,
        PurchaseRequest,
        Banner,
        Policy,
        MaintenanceState,
        MaintenanceLog,
        ProfileLockState,
        PendingStudentRegistration,
        Notification,
        NotificationBatch,
        SupportTicket,
        SupportTicketMessage,
        SupportTicketCategory,
      ],
      // ⚠️ synchronize:true مريح في التطوير بس (بيبني الجداول من الـ entities
      // تلقائي من غير migrations). لازم يتقفل ويتستبدل بـ migrations حقيقية
      // (typeorm migration:generate) قبل أي نشر production حقيقي.
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    StudentsModule,
    DashboardModule,
    ActivityLogModule,
    AcademicModule,
    CoursesModule,
    UploadsModule,
    PaymentsModule,
    OrdersModule,
    ReportsModule,
    BannersModule,
    PoliciesModule,
    MaintenanceModule,
    ProfileLockModule,
    StudentAuthModule,
    NotificationsModule,
    TicketsModule,
  ],
  providers: [
    // ⚠️ حارسين عامين على *كل* endpoint في المشروع، بالترتيب ده: الـ
    // rate limit الأول (يرفض الزيادة قبل ما نتعب في التحقق من التوكن)،
    // بعده الـ JWT (محتاج توكن إلا لو الـ route متعلّم بـ @Public()).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
