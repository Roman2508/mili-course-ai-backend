import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { LearningModule } from '../learning/learning.module';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [CommonModule, LearningModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
