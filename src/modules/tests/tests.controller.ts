import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestsService } from './tests.service';

@Controller('tests')
@UseGuards(AuthGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post(':id/submit')
  async submit(
    @CurrentUser('id') userId: string,
    @Param('id') testOrModuleId: string,
    @Body() dto: SubmitTestDto,
  ) {
    return this.testsService.submitTest(
      userId,
      dto.courseId,
      testOrModuleId,
      dto.answers,
    );
  }
}
