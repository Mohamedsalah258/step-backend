/**
 * مصدر الحقيقة الوحيد لأنواع الأحداث (ActionType) وأسمائها العربية وألوانها.
 * أي دومين جديد (orders, courses...) يضيف مفاتيحه هنا فقط — الفرونت
 * (StatusBadge / Badge tone) ماله دعوة بالمفاتيح دي، هو بس بياخد النص
 * والتون الجاهزين من الـ API.
 */
export enum ActionType {
  DEVICE_RESET = 'device_reset',
  BAN_STUDENT = 'ban_student',
  UNBAN_STUDENT = 'unban_student',
  OPEN_COURSE = 'open_course',
  CANCEL_SUBSCRIPTION = 'cancel_subscription',
  REACTIVATE_SUBSCRIPTION = 'reactivate_subscription',
  APPROVE_ORDER = 'approve_order',
  REJECT_ORDER = 'reject_order',
  MAINTENANCE_ON = 'maintenance_on',
  MAINTENANCE_OFF = 'maintenance_off',
  TERM_RESET = 'term_reset',
  PROFILE_LOCK_ON = 'profile_lock_on',
  PROFILE_LOCK_OFF = 'profile_lock_off',
  STUDENT_PROFILE_UNLOCKED = 'student_profile_unlocked',
  STUDENT_PROFILE_LOCKED = 'student_profile_locked',
  CREATE_COURSE = 'create_course',
  UPDATE_COURSE = 'update_course',
  DELETE_COURSE = 'delete_course',
  PUBLISH_COURSE = 'publish_course',
  WITHDRAW_COURSE = 'withdraw_course',
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'brand' | 'neutral'

/** النص العربي المعروض في عمود «النشاط» بجدول سجل العمليات */
export const ACTION_LABEL_AR: Record<ActionType, string> = {
  [ActionType.DEVICE_RESET]: 'ريست جهاز',
  [ActionType.BAN_STUDENT]: 'حظر طالب',
  [ActionType.UNBAN_STUDENT]: 'فك حظر طالب',
  [ActionType.OPEN_COURSE]: 'فتح اشتراك يدوي',
  [ActionType.CANCEL_SUBSCRIPTION]: 'إلغاء اشتراك',
  [ActionType.REACTIVATE_SUBSCRIPTION]: 'تنشيط اشتراك',
  [ActionType.APPROVE_ORDER]: 'موافقة طلب شراء',
  [ActionType.REJECT_ORDER]: 'رفض طلب شراء',
  [ActionType.MAINTENANCE_ON]: 'تفعيل وضع الصيانة',
  [ActionType.MAINTENANCE_OFF]: 'إيقاف وضع الصيانة',
  [ActionType.TERM_RESET]: 'تصفير ترم',
  [ActionType.CREATE_COURSE]: 'إضافة كورس',
  [ActionType.UPDATE_COURSE]: 'تعديل كورس',
  [ActionType.DELETE_COURSE]: 'حذف كورس',
  [ActionType.PUBLISH_COURSE]: 'تفعيل كورس',
  [ActionType.WITHDRAW_COURSE]: 'تعطيل كورس',
  [ActionType.PROFILE_LOCK_ON]: 'قفل تعديل البروفايل لكل الطلاب',
  [ActionType.PROFILE_LOCK_OFF]: 'فتح تعديل البروفايل لكل الطلاب',
  [ActionType.STUDENT_PROFILE_UNLOCKED]: 'فتح تعديل البروفايل لطالب',
  [ActionType.STUDENT_PROFILE_LOCKED]: 'قفل تعديل البروفايل لطالب',
}

/** تون البادج في جدول سجل العمليات (ActivityRow.tone) */
export const ACTION_TONE: Record<ActionType, BadgeTone> = {
  [ActionType.DEVICE_RESET]: 'warning',
  [ActionType.BAN_STUDENT]: 'danger',
  [ActionType.UNBAN_STUDENT]: 'success',
  [ActionType.OPEN_COURSE]: 'success',
  [ActionType.CANCEL_SUBSCRIPTION]: 'danger',
  [ActionType.REACTIVATE_SUBSCRIPTION]: 'success',
  [ActionType.APPROVE_ORDER]: 'success',
  [ActionType.REJECT_ORDER]: 'danger',
  [ActionType.MAINTENANCE_ON]: 'warning',
  [ActionType.MAINTENANCE_OFF]: 'success',
  [ActionType.TERM_RESET]: 'danger',
  [ActionType.CREATE_COURSE]: 'success',
  [ActionType.UPDATE_COURSE]: 'brand',
  [ActionType.DELETE_COURSE]: 'danger',
  [ActionType.PUBLISH_COURSE]: 'success',
  [ActionType.WITHDRAW_COURSE]: 'warning',
  [ActionType.PROFILE_LOCK_ON]: 'warning',
  [ActionType.PROFILE_LOCK_OFF]: 'success',
  [ActionType.STUDENT_PROFILE_UNLOCKED]: 'success',
  [ActionType.STUDENT_PROFILE_LOCKED]: 'warning',
}

/**
 * النص العربي المعروض كـ "status" في جدول RECENT_ACTIVITY بالداشبورد
 * (ده بيتاخد بالـ StatusBadge الموجود بالفعل في الفرونت، فلازم يطابق
 * مفاتيح STATUS_TONE في components/ui/Badge.tsx بالحرف).
 */
export const ACTION_DASHBOARD_STATUS: Record<ActionType, string> = {
  [ActionType.DEVICE_RESET]: 'مقبول',
  [ActionType.BAN_STUDENT]: 'محظور',
  [ActionType.UNBAN_STUDENT]: 'مقبول',
  [ActionType.OPEN_COURSE]: 'مقبول',
  [ActionType.CANCEL_SUBSCRIPTION]: 'ملغي',
  [ActionType.REACTIVATE_SUBSCRIPTION]: 'مقبول',
  [ActionType.APPROVE_ORDER]: 'مقبول',
  [ActionType.REJECT_ORDER]: 'مرفوض',
  [ActionType.MAINTENANCE_ON]: 'قيد المراجعة',
  [ActionType.MAINTENANCE_OFF]: 'مقبول',
  [ActionType.TERM_RESET]: 'مرفوض',
  [ActionType.CREATE_COURSE]: 'مقبول',
  [ActionType.UPDATE_COURSE]: 'مكتمل',
  [ActionType.DELETE_COURSE]: 'مرفوض',
  [ActionType.PUBLISH_COURSE]: 'منشور',
  [ActionType.WITHDRAW_COURSE]: 'معطّل',
  [ActionType.PROFILE_LOCK_ON]: 'قيد المراجعة',
  [ActionType.PROFILE_LOCK_OFF]: 'مقبول',
  [ActionType.STUDENT_PROFILE_UNLOCKED]: 'مقبول',
  [ActionType.STUDENT_PROFILE_LOCKED]: 'قيد المراجعة',
}

/** النص العربي المعروض كـ "activity" (نوع النشاط) في جدول الداشبورد */
export const ACTION_DASHBOARD_LABEL: Record<ActionType, string> = ACTION_LABEL_AR

export const STUDENT_STATUS_AR = {
  ACTIVE: 'نشط',
  BANNED: 'محظور',
} as const

export const SUBSCRIPTION_STATUS_AR = {
  ACTIVE: 'نشط',
  CANCELLED: 'ملغي',
} as const
