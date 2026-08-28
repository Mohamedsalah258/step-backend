import { Controller, Get, Query, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ActivityLogService } from './activity-log.service'
import { ListActivityQueryDto } from './dto/list-activity-query.dto'

@ApiBearerAuth()
@ApiTags('activity-log')
@Controller('activity-log')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  list(@Query() query: ListActivityQueryDto) {
    return this.service.list(query)
  }

  @Get('stats')
  stats() {
    return this.service.stats()
  }

  @Get('export.csv')
  async exportCsv(@Query() query: ListActivityQueryDto, @Res() res: Response) {
    const csv = await this.service.exportCsv(query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="activity-log.csv"')
    res.send(csv)
  }
}
