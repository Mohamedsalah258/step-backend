import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Banner } from '../database/entities/banner.entity'
import { CreateBannerDto } from './dto/create-banner.dto'
import { UpdateBannerDto } from './dto/update-banner.dto'

@Injectable()
export class BannersService {
  constructor(@InjectRepository(Banner) private bannersRepo: Repository<Banner>) {}

  async list() {
    const rows = await this.bannersRepo.find({ order: { order: 'ASC', createdAt: 'ASC' } })
    return rows.map(this.toRow)
  }

  /** لتطبيق الطالب — البنرات المفعّلة بس، بترتيبها (endpoint عام @Public) */
  async listActive() {
    const rows = await this.bannersRepo.find({
      where: { isActive: true },
      order: { order: 'ASC', createdAt: 'ASC' },
    })
    return rows.map(this.toRow)
  }

  async create(dto: CreateBannerDto) {
    const saved = await this.bannersRepo.save(
      this.bannersRepo.create({
        title: dto.title,
        type: dto.type,
        imageFileId: dto.imageFileId ?? null,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async update(id: string, dto: UpdateBannerDto) {
    await this.mustFind(id)
    await this.bannersRepo.update(id, dto)
    return { ok: true }
  }

  async toggle(id: string) {
    const banner = await this.mustFind(id)
    banner.isActive = !banner.isActive
    await this.bannersRepo.save(banner)
    return { ok: true, isActive: banner.isActive }
  }

  async delete(id: string) {
    await this.mustFind(id)
    await this.bannersRepo.delete(id)
    return { ok: true }
  }

  private toRow(b: Banner) {
    return {
      id: b.id,
      title: b.title,
      type: b.type,
      imageFileId: b.imageFileId,
      order: b.order,
      isActive: b.isActive,
    }
  }

  private async mustFind(id: string): Promise<Banner> {
    const banner = await this.bannersRepo.findOne({ where: { id } })
    if (!banner) throw new NotFoundException('البنر غير موجود')
    return banner
  }
}
