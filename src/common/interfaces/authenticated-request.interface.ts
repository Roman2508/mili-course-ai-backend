import type { Request } from 'express';
import type {
  AuthenticatedSession,
  SessionUser,
} from '../../modules/auth/auth.types';

export interface AuthenticatedRequest extends Request {
  authSession?: AuthenticatedSession;
  authUser?: SessionUser;
}
