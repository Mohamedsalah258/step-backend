import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { BannersService } from './banners.service'
import { CreateBannerDto } from './dto/create-banner.dto'
import { UpdateBannerDto } from './dto/update-banner.dto'

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  /** لتطبيق الطالب لاحقًا — بدون JWT، نفس منطق GET /uploads/:fileId */
  @Public()
  @Get('active')
  listActive() {
    return this.bannersService.listActive()
  }

  @ApiBearerAuth()
  @Get()
  list() {
    return this.bannersService.list()
  }

  @ApiBearerAuth()
  @Post()
  create(@Body() dto: CreateBannerDto) {
    return this.bannersService.create(dto)
  }

  @ApiBearerAuth()
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBannerDto) {
    return this.bannersService.update(id, dto)
  }

  @ApiBearerAuth()
  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.bannersService.toggle(id)
  }

  @ApiBearerAuth()
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.bannersService.delete(id)
  }
}
