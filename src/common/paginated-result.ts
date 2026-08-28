/**
 * شكل موحّد لأي رد قوائم (list) في المشروع — شوف STEP_Admin_Backend spec §5.أ.
 * `meta` ممكن يحمل حقول إضافية خاصة بالدومين (زي tabs لصفحة الطلاب) فوق
 * الأربعة الأساسيين.
 */
export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    [key: string]: unknown
  }
}
