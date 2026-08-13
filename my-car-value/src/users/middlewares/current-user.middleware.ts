import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { User } from '../user.entity';
import { UsersService } from '../users.service';

export interface RequestWithCurrentUser extends Request {
  currentUser?: User | null;
}

/**
 * Attaches the signed-in user to the request.
 *
 * This is middleware rather than an interceptor because Nest runs
 * middleware -> guards -> interceptors. AdminGuard needs `currentUser`, so
 * populating it in an interceptor would be too late: the guard would see
 * undefined and reject every request.
 */
@Injectable()
export class CurrentUserMiddleware implements NestMiddleware {
  constructor(private readonly usersService: UsersService) {}

  async use(req: RequestWithCurrentUser, _res: Response, next: NextFunction) {
    const userId = req.session?.userId as number | undefined;

    if (userId) {
      req.currentUser = await this.usersService.findOne(userId);
    }

    next();
  }
}
