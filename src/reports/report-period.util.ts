export type Period = { from: Date; to: Date }

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_WINDOW_DAYS = 30

/** لو من/إلى متبعتش، الافتراضي آخر 30 يوم — عشان "الفترة السابقة" تفضل معرّفة دايمًا */
export function parsePeriod(from?: string, to?: string): Period {
  const to_ = to ? new Date(`${to}T23:59:59.999Z`) : new Date()
  const from_ = from
    ? new Date(`${from}T00:00:00.000Z`)
    : new Date(to_.getTime() - (DEFAULT_WINDOW_DAYS - 1) * DAY_MS)
  return { from: from_, to: to_ }
}

/** الفترة السابقة مباشرة، بنفس طول الفترة الحالية بالظبط */
export function previousPeriod(period: Period): Period {
  const lengthMs = period.to.getTime() - period.from.getTime()
  return {
    from: new Date(period.from.getTime() - lengthMs - 1),
    to: new Date(period.from.getTime() - 1),
  }
}

/** % التغيّر — null لو مفيش قيمة سابقة يتقاس عليها (بدل ادّعاء رقم وهمي) */
export function percentDelta(current: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
