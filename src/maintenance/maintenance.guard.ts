import { CanActivate, HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MaintenanceState } from '../database/entities/maintenance-state.entity'
import { AppException } from '../common/exceptions/app-exception'
import { ErrorCode } from '../common/exceptions/error-code.enum'

/**
 * بيتحط يدويًا (زي StudentJwtAuthGuard) على controllers الطالب بس — لما
 * وضع الصيانة يكون مفعّل، أي route متحط عليه الحارس ده بيترفض فورًا.
 * الأدمن مش متأثر خالص لأن حارسه (JwtAuthGuard) منفصل تمامًا ومفيهوش
 * الحارس ده، فيقدر يشتغل عادي وقت الصيانة (هو أصلاً اللي بيتحكم فيها).
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    @InjectRepository(MaintenanceState) private stateRepo: Repository<MaintenanceState>,
  ) {}

  async canActivate(): Promise<boolean> {
    const [state] = await this.stateRepo.find({ take: 1 })
    if (state?.isActive) {
      throw new AppException(
        ErrorCode.MAINTENANCE_MODE,
        state.message,
        undefined,
        HttpStatus.SERVICE_UNAVAILABLE,
      )
    }
    return true
  }
}
