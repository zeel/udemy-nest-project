import { describe, expect, it } from '@jest/globals';
import { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

const contextWith = (request: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as ExecutionContext;

describe('AuthGuard', () => {
  const guard = new AuthGuard();

  it('allows a request with a signed-in session', () => {
    expect(guard.canActivate(contextWith({ session: { userId: 1 } }))).toBe(
      true,
    );
  });

  it('blocks a request with an empty session', () => {
    expect(guard.canActivate(contextWith({ session: {} }))).toBe(false);
  });

  it('blocks a request with a cleared session (signed out)', () => {
    expect(guard.canActivate(contextWith({ session: { userId: null } }))).toBe(
      false,
    );
  });

  it('blocks a request with no session at all', () => {
    expect(guard.canActivate(contextWith({}))).toBe(false);
  });

  it('reads the session, not currentUser — guards run before interceptors', () => {
    // A guard written against `currentUser` would reject every request,
    // because CurrentUserMiddleware populates it, and only middleware runs
    // before guards — an interceptor would be too late.
    expect(
      guard.canActivate(
        contextWith({ session: { userId: 1 }, currentUser: undefined }),
      ),
    ).toBe(true);
  });
});
