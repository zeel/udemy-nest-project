import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

interface RequestWithSession {
  session?: { userId?: number | null };
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithSession>();

    // Guards run before interceptors, so `request.currentUser` is not
    // populated yet — the session is the only thing available here.
    return !!request.session?.userId;
  }
}
