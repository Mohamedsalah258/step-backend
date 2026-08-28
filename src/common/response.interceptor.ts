import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { map, Observable } from 'rxjs'

export interface ApiSuccessResponse<T> {
  success: true
  data: T
  message: string | null
}

/**
 * يلف كل رد ناجح بـ { success, data, message } — العقد الموحّد المتفق عليه
 * (شوف STEP_Admin_Backend spec §5.أ). لا يلمس الـ endpoints اللي بتستخدم
 * @Res() مباشر (زي activity-log export.csv وuploads download) — NestJS
 * أصلًا بيتخطى الـ interceptors لما الـ handler ياخد @Res() من غير
 * { passthrough: true }.
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        message: null,
      })),
    )
  }
}
