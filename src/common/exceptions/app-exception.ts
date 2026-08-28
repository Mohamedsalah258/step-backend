import { HttpException, HttpStatus } from '@nestjs/common'
import { ErrorCode } from './error-code.enum'

/**
 * استثناء لأي حالة محتاجة كود ثابت من ErrorCode (زي DUPLICATE_REFERENCE) —
 * مش بديل لاستثناءات NestJS العادية (NotFoundException...)، دي بتتحول
 * لـ code افتراضي مناسب تلقائيًا في AllExceptionsFilter.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode
  readonly fields?: Record<string, string>

  constructor(
    code: ErrorCode,
    message: string,
    fields?: Record<string, string>,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, status)
    this.code = code
    this.fields = fields
  }
}
