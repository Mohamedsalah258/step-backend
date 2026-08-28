import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { University } from '../database/entities/university.entity'
import { College } from '../database/entities/college.entity'
import { Specialization } from '../database/entities/specialization.entity'
import { Stage } from '../database/entities/stage.entity'
import { Term } from '../database/entities/term.entity'
import { Course } from '../database/entities/course.entity'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { AcademicStatus } from '../database/entities/academic-status.enum'
import { PaginatedResult } from '../common/paginated-result'
import { ActionType } from '../common/action-catalog'
import type { JwtPayload } from '../auth/jwt.strategy'
import { CreateUniversityDto } from './dto/create-university.dto'
import { CreateCollegeDto } from './dto/create-college.dto'
import { CreateSpecializationDto } from './dto/create-specialization.dto'
import { CreateStageDto } from './dto/create-stage.dto'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateAcademicNodeDto } from './dto/update-academic-node.dto'

const STATUS_AR: Record<AcademicStatus, string> = {
  [AcademicStatus.ACTIVE]: 'نشط',
  [AcademicStatus.DISABLED]: 'معطل',
}

type ListQuery = { page?: number; limit?: number; parentId?: string }

@Injectable()
export class AcademicService {
  constructor(
    @InjectRepository(University) private universitiesRepo: Repository<University>,
    @InjectRepository(College) private collegesRepo: Repository<College>,
    @InjectRepository(Specialization)
    private specializationsRepo: Repository<Specialization>,
    @InjectRepository(Stage) private stagesRepo: Repository<Stage>,
    @InjectRepository(Term) private termsRepo: Repository<Term>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(ActivityLog) private activityRepo: Repository<ActivityLog>,
  ) {}

  async listUniversities(query: ListQuery) {
    const { page, limit } = this.pagination(query)
    const [rows, total] = await this.universitiesRepo.findAndCount({
      order: { createdAt: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    const data = await Promise.all(
      rows.map(async (u, i) => ({
        id: u.id,
        index: String((page - 1) * limit + i + 1),
        name: u.name,
        colleges: await this.collegesRepo.count({ where: { universityId: u.id } }),
        courses: await this.coursesRepo.count({ where: { universityId: u.id } }),
        status: STATUS_AR[u.status],
        date: u.createdAt.toISOString(),
      })),
    )
    return this.wrap(data, page, limit, total)
  }

  async createUniversity(dto: CreateUniversityDto) {
    const saved = await this.universitiesRepo.save(
      this.universitiesRepo.create({ name: dto.name, status: dto.status }),
    )
    return { ok: true, id: saved.id }
  }

  async updateUniversity(id: string, dto: UpdateAcademicNodeDto) {
    const university = await this.mustFind(this.universitiesRepo, id, 'الجامعة غير موجودة')
    await this.universitiesRepo.save({ ...university, ...dto })
    return { ok: true }
  }

  async deleteUniversity(id: string) {
    await this.mustFind(this.universitiesRepo, id, 'الجامعة غير موجودة')
    await this.universitiesRepo.delete(id)
    return { ok: true }
  }

  async listColleges(query: ListQuery) {
    const { page, limit } = this.pagination(query)
    const where = query.parentId ? { universityId: query.parentId } : {}
    const [rows, total] = await this.collegesRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    })
    const data = await Promise.all(
      rows.map(async (c, i) => ({
        id: c.id,
        index: String((page - 1) * limit + i + 1),
        name: c.name,
        universityId: c.universityId,
        departments: await this.specializationsRepo.count({ where: { collegeId: c.id } }),
        courses: await this.coursesRepo.count({ where: { collegeId: c.id } }),
        status: STATUS_AR[c.status],
      })),
    )
    return this.wrap(data, page, limit, total)
  }

  async createCollege(dto: CreateCollegeDto) {
    await this.mustExist(this.universitiesRepo, dto.universityId, 'الجامعة غير موجودة')
    const saved = await this.collegesRepo.save(
      this.collegesRepo.create({
        name: dto.name,
        universityId: dto.universityId,
        status: dto.status,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async updateCollege(id: string, dto: UpdateAcademicNodeDto) {
    const college = await this.mustFind(this.collegesRepo, id, 'الكلية غير موجودة')
    await this.collegesRepo.save({ ...college, ...dto })
    return { ok: true }
  }

  async deleteCollege(id: string) {
    await this.mustFind(this.collegesRepo, id, 'الكلية غير موجودة')
    await this.collegesRepo.delete(id)
    return { ok: true }
  }

  async listSpecializations(query: ListQuery) {
    const { page, limit } = this.pagination(query)
    const where = query.parentId ? { collegeId: query.parentId } : {}
    const [rows, total] = await this.specializationsRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    })
    const data = await Promise.all(
      rows.map(async (s, i) => ({
        id: s.id,
        index: String((page - 1) * limit + i + 1),
        name: s.name,
        collegeId: s.collegeId,
        stages: await this.stagesRepo.count({ where: { specializationId: s.id } }),
        courses: await this.coursesRepo.count({ where: { specializationId: s.id } }),
        status: STATUS_AR[s.status],
      })),
    )
    return this.wrap(data, page, limit, total)
  }

  async createSpecialization(dto: CreateSpecializationDto) {
    await this.mustExist(this.collegesRepo, dto.collegeId, 'الكلية غير موجودة')
    const saved = await this.specializationsRepo.save(
      this.specializationsRepo.create({
        name: dto.name,
        collegeId: dto.collegeId,
        status: dto.status,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async updateSpecialization(id: string, dto: UpdateAcademicNodeDto) {
    const specialization = await this.mustFind(
      this.specializationsRepo,
      id,
      'التخصص غير موجود',
    )
    await this.specializationsRepo.save({ ...specialization, ...dto })
    return { ok: true }
  }

  async deleteSpecialization(id: string) {
    await this.mustFind(this.specializationsRepo, id, 'التخصص غير موجود')
    await this.specializationsRepo.delete(id)
    return { ok: true }
  }

  async listStages(query: ListQuery) {
    const { page, limit } = this.pagination(query)
    const where = query.parentId ? { specializationId: query.parentId } : {}
    const [rows, total] = await this.stagesRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    })
    const data = await Promise.all(
      rows.map(async (s, i) => ({
        id: s.id,
        index: String((page - 1) * limit + i + 1),
        name: s.name,
        specializationId: s.specializationId,
        terms: await this.termsRepo.count({ where: { stageId: s.id } }),
        courses: await this.coursesRepo.count({ where: { stageId: s.id } }),
        status: STATUS_AR[s.status],
      })),
    )
    return this.wrap(data, page, limit, total)
  }

  async createStage(dto: CreateStageDto) {
    await this.mustExist(this.specializationsRepo, dto.specializationId, 'التخصص غير موجود')
    const saved = await this.stagesRepo.save(
      this.stagesRepo.create({
        name: dto.name,
        specializationId: dto.specializationId,
        status: dto.status,
      }),
    )
    return { ok: true, id: saved.id }
  }

  async updateStage(id: string, dto: UpdateAcademicNodeDto) {
    const stage = await this.mustFind(this.stagesRepo, id, 'المرحلة غير موجودة')
    await this.stagesRepo.save({ ...stage, ...dto })
    return { ok: true }
  }

  async deleteStage(id: string) {
    await this.mustFind(this.stagesRepo, id, 'المرحلة غير موجودة')
    await this.stagesRepo.delete(id)
    return { ok: true }
  }

  async listTerms(query: ListQuery) {
    const { page, limit } = this.pagination(query)
    const where = query.parentId ? { stageId: query.parentId } : {}
    const [rows, total] = await this.termsRepo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
    })
    const data = await Promise.all(
      rows.map(async (t, i) => ({
        id: t.id,
        index: String((page - 1) * limit + i + 1),
        name: t.name,
        stageId: t.stageId,
        courses: await this.coursesRepo.count({ where: { termId: t.id } }),
        status: STATUS_AR[t.status],
      })),
    )
    return this.wrap(data, page, limit, total)
  }

  async createTerm(dto: CreateTermDto) {
    await this.mustExist(this.stagesRepo, dto.stageId, 'المرحلة غير موجودة')
    const saved = await this.termsRepo.save(
      this.termsRepo.create({ name: dto.name, stageId: dto.stageId, status: dto.status }),
    )
    return { ok: true, id: saved.id }
  }

  async updateTerm(id: string, dto: UpdateAcademicNodeDto) {
    const term = await this.mustFind(this.termsRepo, id, 'الترم غير موجود')
    await this.termsRepo.save({ ...term, ...dto })
    return { ok: true }
  }

  async deleteTerm(id: string) {
    await this.mustFind(this.termsRepo, id, 'الترم غير موجود')
    await this.termsRepo.delete(id)
    return { ok: true }
  }

  /** التأثير المتوقع لتصفير ترم — بيتحسب من غير أي تعديل، عشان يتعرض قبل التأكيد */
  async termResetImpact(termId: string) {
    const term = await this.mustFind(this.termsRepo, termId, 'الترم غير موجود')
    const courses = await this.coursesRepo.find({ where: { termId } })
    const courseNames = courses.map((c) => c.name)
    if (courseNames.length === 0) {
      return { termName: term.name, coursesCount: 0, studentsCount: 0, subscriptionsCount: 0 }
    }

    const activeSubs = await this.subscriptionsRepo.find({
      where: { courseName: In(courseNames), status: SubscriptionStatus.ACTIVE },
    })
    const studentsCount = new Set(activeSubs.map((s) => s.studentId)).size

    return {
      termName: term.name,
      coursesCount: courses.length,
      studentsCount,
      subscriptionsCount: activeSubs.length,
    }
  }

  /**
   * تصفير الترم = إلغاء كل اشتراكات الطلاب النشطة في كورسات الترم ده (مش حذف
   * الكورسات نفسها ولا الطلاب) — الطلاب بيفقدوا الوصول، بس سجلهم (الاشتراك
   * بحالة CANCELLED) فاضل موجود للتاريخ، زي أي إلغاء اشتراك عادي.
   */
  async resetTerm(termId: string, admin: JwtPayload) {
    const impact = await this.termResetImpact(termId)
    if (impact.subscriptionsCount > 0) {
      const courses = await this.coursesRepo.find({ where: { termId } })
      const courseNames = courses.map((c) => c.name)
      await this.subscriptionsRepo
        .createQueryBuilder()
        .update(Subscription)
        .set({ status: SubscriptionStatus.CANCELLED })
        .where('"courseName" IN (:...courseNames) AND status = :status', {
          courseNames,
          status: SubscriptionStatus.ACTIVE,
        })
        .execute()
    }

    await this.activityRepo.save(
      this.activityRepo.create({
        actionType: ActionType.TERM_RESET,
        studentId: null,
        studentNameSnapshot: null,
        courseNameSnapshot: impact.termName,
        details: `${impact.subscriptionsCount} اشتراك · ${impact.studentsCount} طالب`,
        adminId: admin.sub,
        adminName: admin.name,
      }),
    )

    return {
      ok: true,
      coursesAffected: impact.coursesCount,
      studentsAffected: impact.studentsCount,
      subscriptionsAffected: impact.subscriptionsCount,
    }
  }

  private pagination(query: ListQuery) {
    return { page: query.page ?? 1, limit: query.limit ?? 50 }
  }

  private wrap<T>(data: T[], page: number, limit: number, total: number): PaginatedResult<T> {
    return {
      data,
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    }
  }

  private async mustExist<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    message: string,
  ): Promise<void> {
    const found = await repo.findOne({ where: { id } as never })
    if (!found) throw new NotFoundException(message)
  }

  private async mustFind<T extends { id: string }>(
    repo: Repository<T>,
    id: string,
    message: string,
  ): Promise<T> {
    const found = await repo.findOne({ where: { id } as never })
    if (!found) throw new NotFoundException(message)
    return found
  }
}
