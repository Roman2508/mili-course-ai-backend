import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

export const CurrentUser = createParamDecorator(
  (field: string | undefined, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();
    const user = request.authUser;

    if (!field) {
      return user;
    }

    return user?.[field as keyof typeof user];
  },
);
