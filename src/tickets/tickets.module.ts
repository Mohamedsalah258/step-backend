import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SupportTicket } from '../database/entities/support-ticket.entity'
import { SupportTicketMessage } from '../database/entities/support-ticket-message.entity'
import { SupportTicketCategory } from '../database/entities/support-ticket-category.entity'
import { Admin } from '../database/entities/admin.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { ContactSupportMessage } from '../database/entities/contact-support-message.entity'
import { MaintenanceModule } from '../maintenance/maintenance.module'
import { UploadsModule } from '../uploads/uploads.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { TicketsController, TicketCategoriesController } from './tickets.controller'
import { StudentTicketsController } from './student-tickets.controller'
import { TicketsService } from './tickets.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupportTicket,
      SupportTicketMessage,
      SupportTicketCategory,
      Admin,
      ActivityLog,
      ContactSupportMessage,
    ]),
    MaintenanceModule,
    UploadsModule,
    NotificationsModule,
  ],
  controllers: [TicketsController, TicketCategoriesController, StudentTicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
