import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { JwtPayload } from './jwt.strategy'

/** بيرجع الأدمن اللي مسجل دخول حاليًا (متحط في request.user من الـ JwtStrategy). */
export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
