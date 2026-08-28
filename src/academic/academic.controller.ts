import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { Public } from '../auth/public.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { AcademicService } from './academic.service'
import { AcademicListQueryDto } from './dto/academic-list-query.dto'
import { CreateUniversityDto } from './dto/create-university.dto'
import { CreateCollegeDto } from './dto/create-college.dto'
import { CreateSpecializationDto } from './dto/create-specialization.dto'
import { CreateStageDto } from './dto/create-stage.dto'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateAcademicNodeDto } from './dto/update-academic-node.dto'

@ApiBearerAuth()
@ApiTags('academic')
@Controller()
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  /** عام — تطبيق الطالب محتاجها وقت التسجيل قبل ما يكون عنده حساب أصلاً */
  @Public()
  @Get('universities')
  listUniversities(@Query() query: AcademicListQueryDto) {
    return this.academicService.listUniversities(query)
  }

  @Post('universities')
  createUniversity(@Body() dto: CreateUniversityDto) {
    return this.academicService.createUniversity(dto)
  }

  @Patch('universities/:id')
  updateUniversity(@Param('id') id: string, @Body() dto: UpdateAcademicNodeDto) {
    return this.academicService.updateUniversity(id, dto)
  }

  @Delete('universities/:id')
  deleteUniversity(@Param('id') id: string) {
    return this.academicService.deleteUniversity(id)
  }

  @Public()
  @Get('colleges')
  listColleges(@Query() query: AcademicListQueryDto) {
    return this.academicService.listColleges(query)
  }

  @Post('colleges')
  createCollege(@Body() dto: CreateCollegeDto) {
    return this.academicService.createCollege(dto)
  }

  @Patch('colleges/:id')
  updateCollege(@Param('id') id: string, @Body() dto: UpdateAcademicNodeDto) {
    return this.academicService.updateCollege(id, dto)
  }

  @Delete('colleges/:id')
  deleteCollege(@Param('id') id: string) {
    return this.academicService.deleteCollege(id)
  }

  @Public()
  @Get('specializations')
  listSpecializations(@Query() query: AcademicListQueryDto) {
    return this.academicService.listSpecializations(query)
  }

  @Post('specializations')
  createSpecialization(@Body() dto: CreateSpecializationDto) {
    return this.academicService.createSpecialization(dto)
  }

  @Patch('specializations/:id')
  updateSpecialization(@Param('id') id: string, @Body() dto: UpdateAcademicNodeDto) {
    return this.academicService.updateSpecialization(id, dto)
  }

  @Delete('specializations/:id')
  deleteSpecialization(@Param('id') id: string) {
    return this.academicService.deleteSpecialization(id)
  }

  @Public()
  @Get('stages')
  listStages(@Query() query: AcademicListQueryDto) {
    return this.academicService.listStages(query)
  }

  @Post('stages')
  createStage(@Body() dto: CreateStageDto) {
    return this.academicService.createStage(dto)
  }

  @Patch('stages/:id')
  updateStage(@Param('id') id: string, @Body() dto: UpdateAcademicNodeDto) {
    return this.academicService.updateStage(id, dto)
  }

  @Delete('stages/:id')
  deleteStage(@Param('id') id: string) {
    return this.academicService.deleteStage(id)
  }

  /** عام — نفس سبب باقي القوائم فوق (لسه ناقصة هنا لحد دلوقتي، شوف README) */
  @Public()
  @Get('terms')
  listTerms(@Query() query: AcademicListQueryDto) {
    return this.academicService.listTerms(query)
  }

  @Post('terms')
  createTerm(@Body() dto: CreateTermDto) {
    return this.academicService.createTerm(dto)
  }

  @Patch('terms/:id')
  updateTerm(@Param('id') id: string, @Body() dto: UpdateAcademicNodeDto) {
    return this.academicService.updateTerm(id, dto)
  }

  @Delete('terms/:id')
  deleteTerm(@Param('id') id: string) {
    return this.academicService.deleteTerm(id)
  }

  @Get('terms/:id/reset-impact')
  termResetImpact(@Param('id') id: string) {
    return this.academicService.termResetImpact(id)
  }

  @Post('terms/:id/reset')
  resetTerm(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.academicService.resetTerm(id, admin)
  }
}
