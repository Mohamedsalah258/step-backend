import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { ContactSupportService } from './contact-support.service'
import { CreateContactSupportMessageDto } from './dto/create-contact-support-message.dto'
import { ListContactSupportQueryDto } from './dto/list-contact-support-query.dto'
import { ReplyContactSupportMessageDto } from './dto/reply-contact-support-message.dto'

/** "تواصل مع الدعم" من شاشة اللوجين — زائر مش مسجّل دخول أصلًا. Fire-and-forget:
 * الرد بيحصل بإيميل عادي، مفيش محادثة ثنائية في التطبيق (مختلف عن /student/tickets). */
@ApiBearerAuth()
@ApiTags('contact-support')
@Controller('contact-support')
export class ContactSupportController {
  constructor(private readonly contactSupportService: ContactSupportService) {}

  @Public()
  @Post()
  create(@Body() dto: CreateContactSupportMessageDto) {
    return this.contactSupportService.create(dto)
  }

  @Get()
  list(@Query() query: ListContactSupportQueryDto) {
    return this.contactSupportService.list(query)
  }

  @Post(':id/reply')
  reply(
    @Param('id') id: string,
    @Body() dto: ReplyContactSupportMessageDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.contactSupportService.reply(id, dto, admin)
  }
}
