import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { CourseContentType } from '../database/entities/course-content-type.enum'
import { CoursesService } from './courses.service'
import { CreateCourseDto } from './dto/create-course.dto'
import { UpdateCourseDto } from './dto/update-course.dto'
import { ListCoursesQueryDto } from './dto/list-courses-query.dto'
import { CreateContentItemDto } from './dto/create-content-item.dto'
import { UpdateContentItemDto } from './dto/update-content-item.dto'
import { ReorderContentDto } from './dto/reorder-content.dto'

@ApiBearerAuth()
@ApiTags('courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query() query: ListCoursesQueryDto) {
    return this.coursesService.list(query)
  }

  @Post()
  create(@Body() dto: CreateCourseDto, @CurrentAdmin() admin: JwtPayload) {
    return this.coursesService.create(dto, admin)
  }

  @Get(':id')
  getDetail(@Param('id') id: string) {
    return this.coursesService.getDetail(id)
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.coursesService.getStats(id)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentAdmin() admin: JwtPayload,
  ) {
    return this.coursesService.update(id, dto, admin)
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.coursesService.toggle(id, admin)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentAdmin() admin: JwtPayload) {
    return this.coursesService.delete(id, admin)
  }

  @Get(':id/videos')
  listVideos(@Param('id') id: string) {
    return this.coursesService.listContent(id, CourseContentType.VIDEO)
  }

  @Post(':id/videos')
  createVideo(@Param('id') id: string, @Body() dto: CreateContentItemDto) {
    return this.coursesService.createContent(id, CourseContentType.VIDEO, dto)
  }

  @Patch(':id/videos/reorder')
  reorderVideos(@Param('id') id: string, @Body() dto: ReorderContentDto) {
    return this.coursesService.reorderContent(id, CourseContentType.VIDEO, dto.ids)
  }

  @Get(':id/notes')
  listNotes(@Param('id') id: string) {
    return this.coursesService.listContent(id, CourseContentType.NOTE)
  }

  @Post(':id/notes')
  createNote(@Param('id') id: string, @Body() dto: CreateContentItemDto) {
    return this.coursesService.createContent(id, CourseContentType.NOTE, dto)
  }

  @Patch(':id/notes/reorder')
  reorderNotes(@Param('id') id: string, @Body() dto: ReorderContentDto) {
    return this.coursesService.reorderContent(id, CourseContentType.NOTE, dto.ids)
  }

  @Get(':id/summaries')
  listSummaries(@Param('id') id: string) {
    return this.coursesService.listContent(id, CourseContentType.SUMMARY)
  }

  @Post(':id/summaries')
  createSummary(@Param('id') id: string, @Body() dto: CreateContentItemDto) {
    return this.coursesService.createContent(id, CourseContentType.SUMMARY, dto)
  }

  @Patch(':id/summaries/reorder')
  reorderSummaries(@Param('id') id: string, @Body() dto: ReorderContentDto) {
    return this.coursesService.reorderContent(id, CourseContentType.SUMMARY, dto.ids)
  }

  @Get(':id/exams')
  listExams(@Param('id') id: string) {
    return this.coursesService.listContent(id, CourseContentType.EXAM)
  }

  @Post(':id/exams')
  createExam(@Param('id') id: string, @Body() dto: CreateContentItemDto) {
    return this.coursesService.createContent(id, CourseContentType.EXAM, dto)
  }

  @Patch(':id/exams/reorder')
  reorderExams(@Param('id') id: string, @Body() dto: ReorderContentDto) {
    return this.coursesService.reorderContent(id, CourseContentType.EXAM, dto.ids)
  }
}

/** endpoints مشتركة للتعديل/الحذف على عنصر محتوى واحد — الـ id فريد عالميًا، مش محتاج نوعه ولا كورسه */
@ApiBearerAuth()
@ApiTags('courses')
@Controller('course-content')
export class CourseContentController {
  constructor(private readonly coursesService: CoursesService) {}

  @Patch(':itemId')
  update(@Param('itemId') itemId: string, @Body() dto: UpdateContentItemDto) {
    return this.coursesService.updateContent(itemId, dto)
  }

  @Delete(':itemId')
  delete(@Param('itemId') itemId: string) {
    return this.coursesService.deleteContent(itemId)
  }
}
