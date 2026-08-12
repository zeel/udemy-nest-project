import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../user.entity';

interface RequestWithCurrentUser {
  currentUser?: User | null;
}

export const CurrentUser = createParamDecorator(
  (_data: never, context: ExecutionContext): User | null => {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithCurrentUser>();

    return request.currentUser ?? null;
  },
);
