import { ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { IS_PUBLIC_KEY } from './public.decorator'

/**
 * الحارس العام (مسجّل في AppModule عبر APP_GUARD) — بيتطبّق على *كل*
 * endpoint في المشروع تلقائيًا، ما عدا اللي متعلّم بـ @Public().
 * ده اللي بيقفل students/dashboard/activity-log وأي دومين جديد يتضاف
 * لاحقًا من غير ما حد ينسى يحطّله guard يدوي.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (isPublic) return true
    return super.canActivate(context)
  }
}
