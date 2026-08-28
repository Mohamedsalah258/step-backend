export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
]

/** آخر 6 شهور شاملة الشهر الحالي — بترتيب تصاعدي (الأقدم أولاً) */
export function lastSixMonths(reference = new Date()): { year: number; month: number; label: string }[] {
  const result: { year: number; month: number; label: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: ARABIC_MONTHS[d.getMonth()],
    })
  }
  return result
}
