import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthService } from './auth.service';
import { User } from './user.entity';

const makeUser = (id: number, email: string) =>
  Object.assign(new User(), { id, email, password: 'hashed' });

describe('UsersController', () => {
  let controller: UsersController;
  let fakeUsersService: Partial<UsersService>;
  let fakeAuthService: Partial<AuthService>;

  beforeEach(async () => {
    fakeUsersService = {
      findOne: (id: number) =>
        id === 1 ? Promise.resolve(makeUser(1, 'a@b.com')) : Promise.resolve(null),
      find: (email: string) => Promise.resolve([makeUser(1, email)]),
      remove: (id: number) => Promise.resolve(makeUser(id, 'a@b.com')),
      update: (id: number) => Promise.resolve(makeUser(id, 'updated@b.com')),
    };

    fakeAuthService = {
      signup: (email: string) => Promise.resolve(makeUser(2, email)),
      signin: (email: string) => Promise.resolve(makeUser(3, email)),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: fakeUsersService },
        { provide: AuthService, useValue: fakeAuthService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAllUsers returns users with the given email', async () => {
    const users = await controller.findAllUsers('a@b.com');

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('a@b.com');
  });

  it('findUser returns the user with the given id', async () => {
    const user = await controller.findUser(1);

    expect(user).toBeDefined();
    expect(user.id).toEqual(1);
  });

  it('findUser throws NotFoundException when the user does not exist', async () => {
    await expect(controller.findUser(9999)).rejects.toThrow(NotFoundException);
  });

  it('createUser signs the new user in by setting session.userId', async () => {
    const session: { userId?: number | null } = {};
    const user = await controller.createUser(
      { email: 'a@b.com', password: 'pw' },
      session,
    );

    expect(user.id).toEqual(2);
    expect(session.userId).toEqual(2);
  });

  it('signin sets session.userId', async () => {
    const session: { userId?: number | null } = {};
    const user = await controller.signin(
      { email: 'a@b.com', password: 'pw' },
      session,
    );

    expect(user.id).toEqual(3);
    expect(session.userId).toEqual(3);
  });

  it('signOut clears session.userId', () => {
    const session: { userId?: number | null } = { userId: 5 };
    controller.signOut(session);

    expect(session.userId).toBeNull();
  });

  it('whoAmI returns the current user', () => {
    const user = makeUser(7, 'me@b.com');

    expect(controller.whoAmI(user)).toEqual(user);
  });

  it('whoAmI throws when there is no current user', () => {
    // e.g. the session points at a row that has since been deleted
    expect(() => controller.whoAmI(null)).toThrow(NotFoundException);
  });
});
