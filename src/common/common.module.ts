import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [AuthModule],
  providers: [AuthGuard, RolesGuard],
  exports: [AuthGuard, RolesGuard],
})
export class CommonModule {}
