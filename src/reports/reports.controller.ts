import { Controller, Get, Param, Query, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'
import { ReportsService, type ReportKind } from './reports.service'
import { ReportsQueryDto } from './dto/reports-query.dto'

@ApiBearerAuth()
@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('revenue')
  revenue(@Query() query: ReportsQueryDto) {
    return this.reportsService.revenue(query)
  }

  @Get('students')
  students(@Query() query: ReportsQueryDto) {
    return this.reportsService.students(query)
  }

  @Get('orders')
  orders(@Query() query: ReportsQueryDto) {
    return this.reportsService.orders(query)
  }

  @Get('devices')
  devices(@Query() query: ReportsQueryDto) {
    return this.reportsService.devices(query)
  }

  @Get(':kind/export.csv')
  async exportCsv(
    @Param('kind') kindParam: string,
    @Query() query: ReportsQueryDto,
    @Res() res: Response,
  ) {
    const kind = this.paramKind(kindParam)
    const csv = await this.reportsService.exportCsv(kind, query)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-report.csv"`)
    res.send(csv)
  }

  @Get(':kind/export.xlsx')
  async exportXlsx(
    @Param('kind') kindParam: string,
    @Query() query: ReportsQueryDto,
    @Res() res: Response,
  ) {
    const kind = this.paramKind(kindParam)
    const buffer = await this.reportsService.exportXlsx(kind, query)
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-report.xlsx"`)
    res.send(buffer)
  }

  @Get(':kind/export.pdf')
  async exportPdf(
    @Param('kind') kindParam: string,
    @Query() query: ReportsQueryDto,
    @Res() res: Response,
  ) {
    const kind = this.paramKind(kindParam)
    const buffer = await this.reportsService.exportPdf(kind, query)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${kind}-report.pdf"`)
    res.send(buffer)
  }

  private paramKind(value: string): ReportKind {
    if (value === 'students' || value === 'orders' || value === 'devices') return value
    return 'revenue'
  }
}
