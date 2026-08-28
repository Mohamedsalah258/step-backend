import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import type { Response } from 'express'
import { AppException } from './exceptions/app-exception'
import { ErrorCode } from './exceptions/error-code.enum'

interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    fields?: Record<string, string>
  }
}

/** فallback بسيط من HTTP status لكود افتراضي — للاستثناءات اللي مش AppException */
const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.VALIDATION_ERROR,
}

/**
 * يحوّل أي استثناء (AppException، استثناءات NestJS العادية، أو أي حاجة تانية)
 * لشكل { success:false, error:{code,message,fields?} } — العقد الموحّد.
 * اتنمى بعناية خاصة لحالة ValidationPipe: بترمي BadRequestException بـ
 * message كـ array من الرسايل (سطر لكل حقل فشل)، مش نص واحد — لازم تتحول
 * لـ fields object، مش تتلخبط كنص واحد.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const res = ctx.getResponse<Response>()

    if (exception instanceof AppException) {
      res.status(exception.getStatus()).json(
        this.buildBody(exception.code, exception.message, exception.fields),
      )
      return
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const body = exception.getResponse()

      // شكل ValidationPipe: { statusCode, message: string[], error: '...' }
      if (
        typeof body === 'object' &&
        body !== null &&
        Array.isArray((body as { message?: unknown }).message)
      ) {
        const messages = (body as { message: string[] }).message
        const fields = this.messagesToFields(messages)
        res
          .status(status)
          .json(
            this.buildBody(ErrorCode.VALIDATION_ERROR, 'بيانات غير صالحة', fields),
          )
        return
      }

      const message =
        typeof body === 'object' && body !== null && 'message' in body
          ? String((body as { message: unknown }).message)
          : exception.message
      const code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR
      res.status(status).json(this.buildBody(code, message))
      return
    }

    // استثناء غير متوقع تمامًا (باج حقيقي) — 500 عام، من غير ما نسرّب تفاصيله للعميل
    // eslint-disable-next-line no-console
    console.error(exception)
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(
        this.buildBody(ErrorCode.INTERNAL_ERROR, 'حدث خطأ غير متوقع في السيرفر'),
      )
  }

  private buildBody(
    code: ErrorCode,
    message: string,
    fields?: Record<string, string>,
  ): ApiErrorResponse {
    return { success: false, error: { code, message, fields } }
  }

  /** "email must be an email" -> { email: "email must be an email" } */
  private messagesToFields(messages: string[]): Record<string, string> {
    const fields: Record<string, string> = {}
    messages.forEach((msg, index) => {
      const firstWord = msg.trim().split(' ')[0]
      const key = firstWord || `field${index}`
      fields[key] = msg
    })
    return fields
  }
}
