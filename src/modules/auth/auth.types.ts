import type { UserRole } from '../../generated/prisma/client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedSession {
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role?: UserRole | null;
    [key: string]: unknown;
  };
}
