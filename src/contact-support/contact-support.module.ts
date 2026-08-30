import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContactSupportMessage } from '../database/entities/contact-support-message.entity'
import { MailModule } from '../mail/mail.module'
import { ContactSupportController } from './contact-support.controller'
import { ContactSupportService } from './contact-support.service'

@Module({
  imports: [TypeOrmModule.forFeature([ContactSupportMessage]), MailModule],
  controllers: [ContactSupportController],
  providers: [ContactSupportService],
})
export class ContactSupportModule {}
