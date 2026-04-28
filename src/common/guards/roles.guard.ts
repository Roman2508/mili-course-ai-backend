import {
  CanActivate,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ROLES_METADATA_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import type { UserRole } from '../../generated/prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const currentRole = request.authUser?.role;

    if (!currentRole || !roles.includes(currentRole)) {
      throw new ForbiddenException('You do not have access to this resource.');
    }

    return true;
  }
}
