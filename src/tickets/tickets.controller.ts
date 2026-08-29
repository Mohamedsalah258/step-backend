import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { TicketsService } from './tickets.service'
import { CreateTicketMessageDto } from './dto/create-ticket-message.dto'
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto'
import { AssignTicketDto } from './dto/assign-ticket.dto'
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto'
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto'
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto'

@ApiBearerAuth()
@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@Query() query: ListTicketsQueryDto) {
    return this.ticketsService.list(query)
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.ticketsService.getDetail(id)
  }

  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.ticketsService.addMessageAsAdmin(id, dto, admin)
  }

  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto, @CurrentAdmin() admin: JwtPayload) {
    return this.ticketsService.assign(id, dto, admin)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.ticketsService.updateStatus(id, dto, admin)
  }
}

@ApiBearerAuth()
@ApiTags('ticket-categories')
@Controller('ticket-categories')
export class TicketCategoriesController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.ticketsService.listCategories(includeInactive === 'true')
  }

  @Post()
  create(@Body() dto: CreateTicketCategoryDto) {
    return this.ticketsService.createCategory(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketCategoryDto) {
    return this.ticketsService.updateCategory(id, dto)
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.ticketsService.deactivateCategory(id)
  }
}
