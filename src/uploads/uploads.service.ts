import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as path from 'path'
import { UploadedFile } from '../database/entities/uploaded-file.entity'

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads')

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadedFile)
    private readonly filesRepo: Repository<UploadedFile>,
  ) {}

  async register(
    file: Express.Multer.File,
    adminId: string | null,
  ): Promise<{ fileId: string; originalName: string; sizeBytes: number }> {
    const saved = await this.filesRepo.save(
      this.filesRepo.create({
        originalName: file.originalname,
        storedFilename: file.filename,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByAdminId: adminId,
      }),
    )
    return { fileId: saved.id, originalName: saved.originalName, sizeBytes: saved.sizeBytes }
  }

  async mustFind(fileId: string): Promise<UploadedFile> {
    const found = await this.filesRepo.findOne({ where: { id: fileId } })
    if (!found) throw new NotFoundException('الملف غير موجود')
    return found
  }

  absolutePath(file: UploadedFile): string {
    return path.join(UPLOADS_DIR, file.storedFilename)
  }
}
