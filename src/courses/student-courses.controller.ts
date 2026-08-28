import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/public.decorator'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { CurrentStudent } from '../student-auth/current-student.decorator'
import type { StudentJwtPayload } from '../student-auth/student-jwt.strategy'
import { CourseContentType } from '../database/entities/course-content-type.enum'
import { CoursesService } from './courses.service'
import { ListStudentCoursesQueryDto } from './dto/list-student-courses-query.dto'

/** تصفّح الكورسات من تطبيق الطالب — كل الـ routes هنا للطالب بس (عكس
 * CoursesController العادي اللي للأدمن). */
@Public()
@UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
@ApiBearerAuth()
@ApiTags('student-courses')
@Controller('student/courses')
export class StudentCoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  list(@Query() query: ListStudentCoursesQueryDto, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listPublished(query, student.sub)
  }

  /** لازم قبل :id عشان الراوتر ميدخلش "mine" كـ id */
  @Get('mine')
  mine(@CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listMyCourses(student.sub)
  }

  @Get(':id')
  getDetail(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.getPublicDetail(id, student.sub)
  }

  @Post(':id/enroll')
  enrollFree(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.enrollFree(id, student.sub)
  }

  @Get(':id/videos')
  videos(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listContentForStudent(id, CourseContentType.VIDEO, student.sub)
  }

  @Get(':id/notes')
  notes(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listContentForStudent(id, CourseContentType.NOTE, student.sub)
  }

  @Get(':id/summaries')
  summaries(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listContentForStudent(id, CourseContentType.SUMMARY, student.sub)
  }

  @Get(':id/exams')
  exams(@Param('id') id: string, @CurrentStudent() student: StudentJwtPayload) {
    return this.coursesService.listContentForStudent(id, CourseContentType.EXAM, student.sub)
  }

  @Post(':courseId/content/:itemId/complete')
  markComplete(
    @Param('courseId') courseId: string,
    @Param('itemId') itemId: string,
    @CurrentStudent() student: StudentJwtPayload,
  ) {
    return this.coursesService.markContentComplete(courseId, itemId, student.sub)
  }

  @Delete(':courseId/content/:itemId/complete')
  markIncomplete(
    @Param('courseId') courseId: string,
    @Param('itemId') itemId: string,
    @CurrentStudent() student: StudentJwtPayload,
  ) {
    return this.coursesService.markContentIncomplete(courseId, itemId, student.sub)
  }
}
