import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { User } from '../user.entity';
import { UsersService } from '../users.service';

interface RequestWithCurrentUser {
  session?: { userId?: number | null };
  currentUser?: User | null;
}

@Injectable()
export class CurrentUserInterceptor implements NestInterceptor {
  constructor(private readonly usersService: UsersService) {}

  async intercept(
    context: ExecutionContext,
    handler: CallHandler,
  ): Promise<Observable<any>> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCurrentUser>();
    const userId = request.session?.userId;

    if (userId) {
      request.currentUser = await this.usersService.findOne(userId);
    }

    return handler.handle();
  }
}
