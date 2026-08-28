import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { StudentJwtPayload } from './student-jwt.strategy'

/** بيرجع الطالب اللي مسجّل دخول حاليًا (متحط في request.user من StudentJwtStrategy) */
export const CurrentStudent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): StudentJwtPayload => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
