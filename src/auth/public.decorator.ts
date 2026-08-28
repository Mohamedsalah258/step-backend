import { SetMetadata } from '@nestjs/common'

/**
 * أي route (أو Controller كامل) متعلّم بـ @Public() بيتعدّى الـ JwtAuthGuard
 * العام. من غيرها، كل الـ endpoints مقفولة بالـ auth افتراضيًا.
 */
export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
