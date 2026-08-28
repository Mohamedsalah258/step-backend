import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'

@ApiBearerAuth()
@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboardService.stats()
  }

  @Get('orders-trend')
  ordersTrend() {
    return this.dashboardService.ordersTrend()
  }

  @Get('subs-per-course')
  subsPerCourse() {
    return this.dashboardService.subsPerCourse()
  }

  @Get('monthly-revenue')
  monthlyRevenue() {
    return this.dashboardService.monthlyRevenue()
  }

  @Get('recent-activity')
  recentActivity() {
    return this.dashboardService.recentActivity()
  }
}
