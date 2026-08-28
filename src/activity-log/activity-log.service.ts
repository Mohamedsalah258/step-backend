import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Brackets, Repository } from 'typeorm'
import { ActivityLog } from '../database/entities/activity-log.entity'
import {
  ActionType,
  ACTION_LABEL_AR,
  ACTION_TONE,
  BadgeTone,
} from '../common/action-catalog'
import { PaginatedResult } from '../common/paginated-result'
import { ListActivityQueryDto } from './dto/list-activity-query.dto'

export type ActivityRow = {
  id: string
  index: string
  action: string
  tone: BadgeTone
  details: string | null
  target: string
  datetime: string
  admin: string
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLog) private repo: Repository<ActivityLog>,
  ) {}

  private buildFilteredQuery(query: ListActivityQueryDto) {
    const qb = this.repo.createQueryBuilder('a')

    if (query.q) {
      qb.andWhere(
        new Brackets((b) => {
          b.where('a.studentNameSnapshot ILIKE :q', { q: `%${query.q}%` })
            .orWhere('a.courseNameSnapshot ILIKE :q', { q: `%${query.q}%` })
            .orWhere('a.details ILIKE :q', { q: `%${query.q}%` })
        }),
      )
    }
    if (query.actionType) {
      qb.andWhere('a.actionType = :actionType', { actionType: query.actionType })
    }
    if (query.date) {
      // ⚠️ لازم DATE(...) مش a.createdAt::date — الـ cast بـ `::date` بيتصادم
      // مع regex استبدال البارامترات بتاع TypeORM (":date" بتتطابق جوّه
      // "::date" نفسها) وبيطلع SQL تالف (اتأكد الباج ده فعليًا في orders.service.ts).
      qb.andWhere('DATE(a.createdAt) = :date', { date: query.date })
    }
    return qb
  }

  async list(query: ListActivityQueryDto): Promise<PaginatedResult<ActivityRow>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 10

    const qb = this.buildFilteredQuery(query)
    const total = await qb.getCount()
    const rows = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany()

    const data = rows.map((r, i) => this.toRow(r, (page - 1) * limit + i + 1))

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }

  async stats() {
    const startOfWeek = new Date()
    startOfWeek.setDate(startOfWeek.getDate() - 7)
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const [thisWeek, today, total] = await Promise.all([
      this.repo
        .createQueryBuilder('a')
        .where('a.createdAt >= :d', { d: startOfWeek })
        .getCount(),
      this.repo
        .createQueryBuilder('a')
        .where('a.createdAt >= :d', { d: startOfDay })
        .getCount(),
      this.repo.count(),
    ])
    return { thisWeek, today, total }
  }

  /** بيرجع نفس الصفوف المفلترة (من غير صفحات) كـ CSV جاهز للتصدير */
  async exportCsv(query: ListActivityQueryDto): Promise<string> {
    const qb = this.buildFilteredQuery(query)
    const rows = await qb.orderBy('a.createdAt', 'DESC').getMany()
    const items = rows.map((r, i) => this.toRow(r, i + 1))

    const header = ['#', 'النشاط', 'التفاصيل', 'الهدف', 'التاريخ', 'بواسطة']
    const lines = [header.join(',')]
    for (const it of items) {
      lines.push(
        [it.index, it.action, it.details ?? '', it.target, it.datetime, it.admin]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      )
    }
    return '﻿' + lines.join('\n') // BOM عشان اكسيل يفتح العربي صح
  }

  private toRow(r: ActivityLog, index: number) {
    const action = r.actionType as ActionType
    const target = [r.studentNameSnapshot, r.courseNameSnapshot]
      .filter(Boolean)
      .join(' — ') || 'النظام'
    return {
      id: r.id,
      index: String(index),
      action: ACTION_LABEL_AR[action] ?? r.actionType,
      tone: ACTION_TONE[action] ?? 'neutral',
      details: r.details,
      target,
      datetime: r.createdAt.toISOString(),
      admin: r.adminName,
    }
  }
}
