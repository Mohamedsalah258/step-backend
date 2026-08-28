import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { OrdersService } from './orders.service'
import { ListOrdersQueryDto } from './dto/list-orders-query.dto'
import { RejectOrderDto } from './dto/reject-order.dto'

@ApiBearerAuth()
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  list(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.list(query)
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.ordersService.getDetail(id)
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.ordersService.approve(id, admin)
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectOrderDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.ordersService.reject(id, dto, admin)
  }
}
