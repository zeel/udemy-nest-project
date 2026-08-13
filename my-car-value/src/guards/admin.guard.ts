import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';

interface RequestWithCurrentUser {
  currentUser?: User | null;
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCurrentUser>();

    // Relies on CurrentUserMiddleware having already run. As an interceptor
    // it would run after guards and this would always be undefined.
    return !!request.currentUser?.admin;
  }
}
