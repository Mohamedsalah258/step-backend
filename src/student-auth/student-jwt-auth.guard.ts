import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * حارس بيتحط يدويًا (مش عام زي JwtAuthGuard) على أي endpoint خاص بالطالب —
 * لازم يتحط صراحة على كل route عايز يتأكد إن الطالب مسجّل دخول (زي بروفايله
 * وطلبات الشراء بتاعته)، عكس @Public() اللي بتفتح الـ route من غير أي auth.
 */
@Injectable()
export class StudentJwtAuthGuard extends AuthGuard('student-jwt') {}
