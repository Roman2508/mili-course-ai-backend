import {
  CanActivate,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { BetterAuthService } from '../../modules/auth/better-auth.service';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly betterAuthService: BetterAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const session = await this.betterAuthService.getSession(request);

    if (!session) {
      throw new UnauthorizedException('Authentication is required.');
    }

    request.authSession = session;
    request.authUser = this.betterAuthService.mapSessionUser(session.user);

    return true;
  }
}
