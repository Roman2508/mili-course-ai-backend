import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RecommendationsService } from './recommendations.service';

@Controller('recommendations')
@UseGuards(AuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  async getRecommendationsContext(@CurrentUser('id') userId: string) {
    return this.recommendationsService.getRecommendationsContext(userId);
  }
}
