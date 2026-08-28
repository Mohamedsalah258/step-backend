import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { randomUUID } from 'crypto'
import * as path from 'path'
import type { Response } from 'express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import { CurrentAdmin } from '../auth/current-admin.decorator'
import { Public } from '../auth/public.decorator'
import type { JwtPayload } from '../auth/jwt.strategy'
import { MaintenanceGuard } from '../maintenance/maintenance.guard'
import { StudentJwtAuthGuard } from '../student-auth/student-jwt-auth.guard'
import { UploadsService, UPLOADS_DIR } from './uploads.service'

/** حد مؤقت سخي (200MB) لحد ما نستبدل التخزين المحلي بـ S3 حقيقي مع حدود لكل نوع ملف */
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

const UPLOAD_INTERCEPTOR_OPTIONS = {
  storage: diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req: unknown, file: Express.Multer.File, cb: (err: null, name: string) => void) => {
      const ext = path.extname(file.originalname)
      cb(null, `${randomUUID()}${ext}`)
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
}

@ApiBearerAuth()
@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', UPLOAD_INTERCEPTOR_OPTIONS))
  upload(@UploadedFile() file: Express.Multer.File, @CurrentAdmin() admin: JwtPayload) {
    return this.uploadsService.register(file, admin.sub)
  }

  /** نفس رفع الأدمن بالظبط، بس للطالب (إيصالات طلبات الشراء) — الجهتين
   * منفصلتين عمدًا عشان الحارس المطلوب مختلف (StudentJwtAuthGuard). */
  @Public()
  @UseGuards(MaintenanceGuard, StudentJwtAuthGuard)
  @Post('student')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', UPLOAD_INTERCEPTOR_OPTIONS))
  uploadAsStudent(@UploadedFile() file: Express.Multer.File) {
    return this.uploadsService.register(file, null)
  }

  /**
   * بيرجّع الملف نفسه — مستثنى من ResponseInterceptor عمدًا لأن @Res()
   * من غير { passthrough: true } بيخلي NestJS يعتبر الرد اتبعت يدويًا.
   *
   * ⚠️ @Public() مؤقت: عشان نعرض الغلاف/الفيديو/PDF مباشر في <img>/<video>/
   * رابط تحميل من غير fetch+blob معقّد في كل مكان — من غير كده مفيش طريقة
   * تبعت Authorization header من tag عادي. الحماية الوحيدة حاليًا إن الـ
   * fileId عبارة عن UUID عشوائي مش قابل للتخمين. لما نستبدل التخزين بـ S3
   * حقيقي (خارج نطاق الخطة الحالية)، هنا بالظبط مكان الـ signed URLs.
   */
  @Public()
  @Get(':fileId')
  async download(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.uploadsService.mustFind(fileId)
    res.setHeader('Content-Type', file.mimeType)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.originalName)}"`,
    )
    res.sendFile(this.uploadsService.absolutePath(file))
  }
}
