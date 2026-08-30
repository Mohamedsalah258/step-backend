import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import {
  Between,
  IsNull,
  LessThanOrEqual,
  Not,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import { Subscription, SubscriptionStatus } from '../database/entities/subscription.entity'
import { Student, StudentStatus } from '../database/entities/student.entity'
import { ResetLog } from '../database/entities/reset-log.entity'
import { ReportsQueryDto } from './dto/reports-query.dto'
import { Period, parsePeriod, percentDelta, previousPeriod } from './report-period.util'
import { buildCsv, buildPdf, buildXlsx } from './report-export.util'

const IOS_PATTERN = /iphone|ipad|ios/i

export type ReportKind = 'revenue' | 'students' | 'orders' | 'devices'

function periodLabel(period: Period): string {
  return `الفترة: ${period.from.toISOString().slice(0, 10)} → ${period.to.toISOString().slice(0, 10)}`
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(PurchaseRequest) private purchaseRequestsRepo: Repository<PurchaseRequest>,
    @InjectRepository(Subscription) private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(ResetLog) private resetLogsRepo: Repository<ResetLog>,
  ) {}

  /** الإيراد = مجموع مبالغ طلبات الشراء المقبولة اللي اتسجلت في الفترة المختارة */
  async revenue(query: ReportsQueryDto) {
    const period = parsePeriod(query.from, query.to)
    const compare = query.compare === 'true'

    const currentOrders = await this.approvedOrdersInRange(period, query)
    const current = this.aggregateRevenue(currentOrders)
    const prev = compare
      ? this.aggregateRevenue(await this.approvedOrdersInRange(previousPeriod(period), query))
      : null

    const rows = [...current.byCollege.entries()]
      .map(([faculty, v]) => {
        const prevV = prev?.byCollege.get(faculty)
        return {
          faculty,
          orders: v.orders,
          revenue: v.revenue,
          share: current.totalRevenue > 0 ? Math.round((v.revenue / current.totalRevenue) * 1000) / 10 : 0,
          delta: prev ? percentDelta(v.revenue, prevV?.revenue ?? 0) : null,
        }
      })
      .sort((a, b) => b.revenue - a.revenue)

    return {
      totalRevenue: current.totalRevenue,
      avgOrderValue: current.count > 0 ? Math.round(current.totalRevenue / current.count) : 0,
      approvedOrdersCount: current.count,
      revenueDelta: prev ? percentDelta(current.totalRevenue, prev.totalRevenue) : null,
      ordersDelta: prev ? percentDelta(current.count, prev.count) : null,
      chart: rows.map((r) => ({ label: r.faculty, value: r.revenue })),
      rows,
      periodLabel: periodLabel(period),
    }
  }

  async revenueExportData(query: ReportsQueryDto) {
    const r = await this.revenue(query)
    return {
      headers: ['الكلية', 'عدد الطلبات', 'الإيراد', 'النسبة %'],
      rows: r.rows.map((x) => [x.faculty, x.orders, x.revenue, x.share]),
      stats: [
        { label: 'إجمالي الإيراد', value: `${r.totalRevenue} ج.م` },
        { label: 'متوسط قيمة الطلب', value: `${r.avgOrderValue} ج.م` },
        { label: 'طلبات مقبولة', value: String(r.approvedOrdersCount) },
      ],
      title: 'تقرير الإيرادات',
      periodLabel: r.periodLabel,
    }
  }

  /**
   * طلاب الفترة = عدد الطلاب المتفردين اللي اشتركوا فعليًا (Subscription.subscribedAt)
   * خلال الفترة المختارة — الطالب مالوش "كلية أساسية" في الموديل، فالتجميع
   * بحسب كلية الكورس اللي اشترك فيه.
   */
  async students(query: ReportsQueryDto) {
    const period = parsePeriod(query.from, query.to)
    const compare = query.compare === 'true'

    const [totalStudents, activeSubscriptionsCount, currentSubs] = await Promise.all([
      this.studentsRepo.count({ where: { registeredAt: LessThanOrEqual(period.to) } }),
      this.subscriptionsRepo.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.subsInRange(period, query),
    ])
    const current = this.aggregateStudents(currentSubs)
    const prev = compare
      ? this.aggregateStudents(await this.subsInRange(previousPeriod(period), query))
      : null

    const rows = [...current.byCollege.entries()]
      .map(([faculty, v]) => {
        const prevV = prev?.byCollege.get(faculty)
        return {
          faculty,
          students: v.students.size,
          subscriptions: v.subs,
          delta: prev ? percentDelta(v.students.size, prevV?.students.size ?? 0) : null,
        }
      })
      .sort((a, b) => b.students - a.students)

    return {
      totalStudents,
      activeStudents: current.uniqueStudents.size,
      activeSubscriptionsCount,
      activeStudentsDelta: prev ? percentDelta(current.uniqueStudents.size, prev.uniqueStudents.size) : null,
      chart: rows.map((r) => ({ label: r.faculty, value: r.students })),
      rows,
      periodLabel: periodLabel(period),
    }
  }

  async studentsExportData(query: ReportsQueryDto) {
    const r = await this.students(query)
    return {
      headers: ['الكلية', 'طلاب اشتركوا في الفترة', 'اشتراكات جديدة'],
      rows: r.rows.map((x) => [x.faculty, x.students, x.subscriptions]),
      stats: [
        { label: 'إجمالي الطلاب المسجلين', value: String(r.totalStudents) },
        { label: 'طلاب اشتركوا في الفترة', value: String(r.activeStudents) },
        { label: 'الاشتراكات الفعالة الآن', value: String(r.activeSubscriptionsCount) },
      ],
      title: 'تقرير الطلاب والاشتراكات',
      periodLabel: r.periodLabel,
    }
  }

  /** الطلبات المستلمة = طلبات الشراء اللي اتسجلت (createdAt) في الفترة المختارة */
  async orders(query: ReportsQueryDto) {
    const period = parsePeriod(query.from, query.to)
    const compare = query.compare === 'true'

    const currentOrders = await this.ordersInRange(period, query)
    const current = this.aggregateOrders(currentOrders)
    const prev = compare
      ? this.aggregateOrders(await this.ordersInRange(previousPeriod(period), query))
      : null

    const decided = current.approved + current.rejected
    const approvalRate = decided > 0 ? Math.round((current.approved / decided) * 1000) / 10 : 0

    const rows = [...current.byCourse.entries()]
      .map(([course, v], i) => ({ index: String(i + 1), course, ...v }))
      .sort((a, b) => b.total - a.total)
      .map((r, i) => ({ ...r, index: String(i + 1) }))

    return {
      totalOrders: current.total,
      pendingOrders: current.pending,
      approvalRate,
      totalOrdersDelta: prev ? percentDelta(current.total, prev.total) : null,
      chart: [
        { label: 'معلق', value: current.pending },
        { label: 'مرفوض', value: current.rejected },
        { label: 'مقبول', value: current.approved },
      ],
      rows,
      periodLabel: periodLabel(period),
    }
  }

  async ordersExportData(query: ReportsQueryDto) {
    const r = await this.orders(query)
    return {
      headers: ['#', 'الكورس', 'مقبولة', 'مرفوضة', 'معلقة', 'الإجمالي'],
      rows: r.rows.map((x) => [x.index, x.course, x.accepted, x.rejected, x.pending, x.total]),
      stats: [
        { label: 'إجمالي الطلبات المستلمة', value: String(r.totalOrders) },
        { label: 'طلبات معلقة', value: String(r.pendingOrders) },
        { label: 'معدل القبول', value: `${r.approvalRate}%` },
      ],
      title: 'تقرير طلبات الشراء',
      periodLabel: r.periodLabel,
    }
  }

  /**
   * "جهاز" هنا = طالب عنده جهاز مربوط (Student.deviceIdentifier) اتسجل خلال
   * الفترة المختارة — الموديل الحالي جهاز واحد لكل طالب (سياسة مكافحة
   * القرصنة)، مفيش تتبع أجهزة متعددة ولا حقل نظام تشغيل حقيقي، فنظام
   * التشغيل بيتقدّر تقريبيًا من نص deviceModel (يحتوي iPhone/iPad/iOS ⇐
   * iOS، غير كده Android).
   */
  async devices(query: ReportsQueryDto) {
    const period = parsePeriod(query.from, query.to)
    const compare = query.compare === 'true'

    const [current, resetsInPeriod] = await Promise.all([
      this.devicesInRange(period),
      this.resetLogsRepo.count({ where: { createdAt: Between(period.from, period.to) } }),
    ])
    const currentAgg = this.aggregateDevices(current)

    let resetsDelta: number | null = null
    let devicesDelta: number | null = null
    if (compare) {
      const prevPeriod = previousPeriod(period)
      const [prevDevices, prevResets] = await Promise.all([
        this.devicesInRange(prevPeriod),
        this.resetLogsRepo.count({ where: { createdAt: Between(prevPeriod.from, prevPeriod.to) } }),
      ])
      resetsDelta = percentDelta(resetsInPeriod, prevResets)
      devicesDelta = percentDelta(current.length, prevDevices.length)
    }

    return {
      resetsThisPeriod: resetsInPeriod,
      totalDevices: current.length,
      resetsDelta,
      devicesDelta,
      chart: [
        { label: 'iOS', value: currentAgg.iosCount },
        { label: 'Android', value: currentAgg.androidCount },
      ],
      rows: currentAgg.rows,
      periodLabel: periodLabel(period),
    }
  }

  async devicesExportData(query: ReportsQueryDto) {
    const r = await this.devices(query)
    return {
      headers: ['#', 'الطالب', 'الجهاز', 'نظام التشغيل', 'تاريخ التسجيل', 'الحالة'],
      rows: r.rows.map((x) => [x.index, x.student, x.device, x.os, x.registeredAt.slice(0, 10), x.status]),
      stats: [
        { label: 'أجهزة مسجّلة في الفترة', value: String(r.totalDevices) },
        { label: 'طلبات ريست في الفترة', value: String(r.resetsThisPeriod) },
      ],
      title: 'تقرير الأجهزة',
      periodLabel: r.periodLabel,
    }
  }

  async exportCsv(kind: ReportKind, query: ReportsQueryDto): Promise<string> {
    const data = await this.exportDataFor(kind, query)
    return buildCsv(data.headers, data.rows)
  }

  async exportXlsx(kind: ReportKind, query: ReportsQueryDto): Promise<Buffer> {
    const data = await this.exportDataFor(kind, query)
    return buildXlsx(data.title, data.headers, data.rows)
  }

  async exportPdf(kind: ReportKind, query: ReportsQueryDto): Promise<Buffer> {
    const data = await this.exportDataFor(kind, query)
    return buildPdf(data.title, data.periodLabel, data.stats, data.headers, data.rows)
  }

  private exportDataFor(kind: ReportKind, query: ReportsQueryDto) {
    if (kind === 'revenue') return this.revenueExportData(query)
    if (kind === 'students') return this.studentsExportData(query)
    if (kind === 'orders') return this.ordersExportData(query)
    return this.devicesExportData(query)
  }

  private async approvedOrdersInRange(period: Period, query: ReportsQueryDto) {
    const qb = this.purchaseRequestsRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.course', 'course')
      .leftJoinAndSelect('course.college', 'college')
      .where('o.status = :status', { status: PurchaseRequestStatus.APPROVED })
      .andWhere('o.createdAt BETWEEN :from AND :to', { from: period.from, to: period.to })
    this.applyAcademicFilter(qb, 'course', query)
    return qb.getMany()
  }

  /** فلترة اختيارية بحسب الهرم الأكاديمي (جامعة/كلية/تخصص) عبر alias الكورس المربوط */
  private applyAcademicFilter<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    courseAlias: string,
    query: Pick<ReportsQueryDto, 'universityId' | 'collegeId' | 'specializationId'>,
  ): void {
    if (query.universityId) {
      qb.andWhere(`${courseAlias}."universityId" = :universityId`, {
        universityId: query.universityId,
      })
    }
    if (query.collegeId) {
      qb.andWhere(`${courseAlias}."collegeId" = :collegeId`, { collegeId: query.collegeId })
    }
    if (query.specializationId) {
      qb.andWhere(`${courseAlias}."specializationId" = :specializationId`, {
        specializationId: query.specializationId,
      })
    }
  }

  private aggregateRevenue(orders: PurchaseRequest[]) {
    const byCollege = new Map<string, { orders: number; revenue: number }>()
    let totalRevenue = 0
    for (const o of orders) {
      totalRevenue += o.amount
      const name = o.course.college.name
      const entry = byCollege.get(name) ?? { orders: 0, revenue: 0 }
      entry.orders += 1
      entry.revenue += o.amount
      byCollege.set(name, entry)
    }
    return { totalRevenue, count: orders.length, byCollege }
  }

  private async subsInRange(period: Period, query: ReportsQueryDto) {
    const qb = this.subscriptionsRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.course', 'course')
      .leftJoinAndSelect('course.college', 'college')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('s.subscribedAt BETWEEN :from AND :to', { from: period.from, to: period.to })
    this.applyAcademicFilter(qb, 'course', query)
    return qb.getMany()
  }

  private aggregateStudents(subs: Subscription[]) {
    const byCollege = new Map<string, { students: Set<string>; subs: number }>()
    const uniqueStudents = new Set<string>()
    for (const s of subs) {
      uniqueStudents.add(s.studentId)
      const collegeName = s.course?.college?.name ?? s.collegeName
      const entry = byCollege.get(collegeName) ?? { students: new Set<string>(), subs: 0 }
      entry.students.add(s.studentId)
      entry.subs += 1
      byCollege.set(collegeName, entry)
    }
    return { byCollege, uniqueStudents }
  }

  private async ordersInRange(period: Period, query: ReportsQueryDto) {
    const qb = this.purchaseRequestsRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.course', 'course')
      .where('o.createdAt BETWEEN :from AND :to', { from: period.from, to: period.to })
    this.applyAcademicFilter(qb, 'course', query)
    return qb.getMany()
  }

  private aggregateOrders(orders: PurchaseRequest[]) {
    let pending = 0
    let approved = 0
    let rejected = 0
    const byCourse = new Map<string, { accepted: number; rejected: number; pending: number; total: number }>()
    for (const o of orders) {
      if (o.status === PurchaseRequestStatus.PENDING) pending += 1
      else if (o.status === PurchaseRequestStatus.APPROVED) approved += 1
      else rejected += 1

      const name = o.course.name
      const entry = byCourse.get(name) ?? { accepted: 0, rejected: 0, pending: 0, total: 0 }
      entry.total += 1
      if (o.status === PurchaseRequestStatus.APPROVED) entry.accepted += 1
      else if (o.status === PurchaseRequestStatus.REJECTED) entry.rejected += 1
      else entry.pending += 1
      byCourse.set(name, entry)
    }
    return { total: orders.length, pending, approved, rejected, byCourse }
  }

  private async devicesInRange(period: Period) {
    return this.studentsRepo.find({
      where: { deviceIdentifier: Not(IsNull()), registeredAt: Between(period.from, period.to) },
      order: { registeredAt: 'DESC' },
    })
  }

  private aggregateDevices(devices: Student[]) {
    const iosCount = devices.filter((s) => IOS_PATTERN.test(s.deviceModel ?? '')).length
    const androidCount = devices.length - iosCount
    const rows = devices.slice(0, 10).map((s, i) => ({
      index: String(i + 1),
      student: s.name,
      device: s.deviceModel ?? '—',
      os: IOS_PATTERN.test(s.deviceModel ?? '') ? 'iOS' : 'Android',
      registeredAt: s.registeredAt.toISOString(),
      status: s.status === StudentStatus.ACTIVE ? 'نشط' : 'محظور',
    }))
    return { iosCount, androidCount, rows }
  }
}
