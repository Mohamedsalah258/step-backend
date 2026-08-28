import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Student } from '../database/entities/student.entity'
import {
  Subscription,
  SubscriptionStatus,
} from '../database/entities/subscription.entity'
import { ActivityLog } from '../database/entities/activity-log.entity'
import { Course } from '../database/entities/course.entity'
import { CourseStatus } from '../database/entities/course-status.enum'
import { PurchaseRequest } from '../database/entities/purchase-request.entity'
import { PurchaseRequestStatus } from '../database/entities/purchase-request-status.enum'
import {
  ActionType,
  ACTION_DASHBOARD_LABEL,
  ACTION_DASHBOARD_STATUS,
} from '../common/action-catalog'
import { lastSixMonths } from '../common/arabic-months'

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Student) private studentsRepo: Repository<Student>,
    @InjectRepository(Subscription)
    private subscriptionsRepo: Repository<Subscription>,
    @InjectRepository(ActivityLog)
    private activityRepo: Repository<ActivityLog>,
    @InjectRepository(Course) private coursesRepo: Repository<Course>,
    @InjectRepository(PurchaseRequest) private purchaseRequestsRepo: Repository<PurchaseRequest>,
  ) {}

  /**
   * ⚠️ pendingDeviceResets لسه صفري — مفيش مفهوم "طلب ريست معلّق" في هذا
   * الإصدار (الريست إجراء فوري). باقي الأرقام كلها حقيقية 100% من الداتابيز
   * دلوقتي (pendingOrders بقى حقيقي بعد بناء دومين Orders — Phase 3).
   */
  async stats() {
    const [totalStudents, activeSubscriptions, revenueRow, activeCourses, pendingOrders] =
      await Promise.all([
        this.studentsRepo.count(),
        this.subscriptionsRepo.count({
          where: { status: SubscriptionStatus.ACTIVE },
        }),
        this.subscriptionsRepo
          .createQueryBuilder('s')
          .select('COALESCE(SUM(s.price), 0)', 'total')
          .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
          .getRawOne<{ total: string }>(),
        this.coursesRepo.count({ where: { status: CourseStatus.PUBLISHED } }),
        this.purchaseRequestsRepo.count({ where: { status: PurchaseRequestStatus.PENDING } }),
      ])

    return {
      totalStudents,
      activeSubscriptions,
      courseRevenue: Number(revenueRow?.total ?? 0),
      activeCourses,
      pendingOrders,
      // TODO: مفيش مفهوم "طلب ريست معلّق" في هذا الإصدار — الريست إجراء فوري
      pendingDeviceResets: 0,
    }
  }

  /** معدل طلبات الشراء الحقيقي (شهريًا) من جدول purchase_requests */
  async ordersTrend() {
    const months = lastSixMonths()
    const rows = await this.purchaseRequestsRepo
      .createQueryBuilder('o')
      .select("date_trunc('month', o.createdAt)", 'bucket')
      .addSelect('COUNT(*)', 'total')
      .groupBy('bucket')
      .getRawMany<{ bucket: Date; total: string }>()

    const counts = new Map<string, number>()
    for (const r of rows) {
      const d = new Date(r.bucket)
      counts.set(`${d.getFullYear()}-${d.getMonth()}`, Number(r.total))
    }

    // الديزاين الأصلي بيعرض الترتيب من الأحدث للأقدم (يونيو → يناير)
    const ordered = [...months].reverse()
    return {
      labels: ordered.map((m) => m.label),
      points: ordered.map((m) => counts.get(`${m.year}-${m.month}`) ?? 0),
    }
  }

  async subsPerCourse() {
    const rows = await this.subscriptionsRepo
      .createQueryBuilder('s')
      .select('s.courseName', 'label')
      .addSelect('COUNT(*)', 'value')
      .groupBy('s.courseName')
      .orderBy('value', 'DESC')
      .limit(5)
      .getRawMany<{ label: string; value: string }>()
    return rows.map((r) => ({ label: r.label, value: Number(r.value) }))
  }

  async monthlyRevenue() {
    const months = lastSixMonths()
    const rows = await this.subscriptionsRepo
      .createQueryBuilder('s')
      .select("date_trunc('month', s.subscribedAt)", 'bucket')
      .addSelect('COALESCE(SUM(s.price), 0)', 'total')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('bucket')
      .getRawMany<{ bucket: Date; total: string }>()

    const byKey = new Map(
      rows.map((r) => [
        `${new Date(r.bucket).getFullYear()}-${new Date(r.bucket).getMonth()}`,
        Number(r.total),
      ]),
    )
    return months.map((m) => ({
      label: m.label,
      value: byKey.get(`${m.year}-${m.month}`) ?? 0,
    }))
  }

  async recentActivity(limit = 5) {
    const rows = await this.activityRepo.find({
      order: { createdAt: 'DESC' },
      take: limit,
    })
    return rows.map((r) => {
      const action = r.actionType as ActionType
      return {
        id: r.id,
        activity: ACTION_DASHBOARD_LABEL[action] ?? r.actionType,
        student: r.studentNameSnapshot ?? 'النظام',
        content: r.courseNameSnapshot ?? r.details ?? '—',
        date: r.createdAt.toISOString(),
        status: ACTION_DASHBOARD_STATUS[action] ?? 'قيد المراجعة',
      }
    })
  }

}
