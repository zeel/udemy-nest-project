import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let users: User[];

  beforeEach(async () => {
    users = [];

    const fakeUsersService: Partial<UsersService> = {
      find: (email: string) =>
        Promise.resolve(users.filter((user) => user.email === email)),
      create: (email: string, password: string) => {
        const user = Object.assign(new User(), {
          id: users.length + 1,
          email,
          password,
        });
        users.push(user);

        return Promise.resolve(user);
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: fakeUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    it('creates a user with a salted and hashed password', async () => {
      const user = await service.signup('a@b.com', 'mypassword');

      expect(user.password).not.toEqual('mypassword');

      const [salt, hash] = user.password.split('.');
      expect(salt).toBeDefined();
      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64);
    });

    it('uses a different salt for each user', async () => {
      const one = await service.signup('a@b.com', 'samepassword');
      const two = await service.signup('c@d.com', 'samepassword');

      expect(one.password.split('.')[0]).not.toEqual(
        two.password.split('.')[0],
      );
      expect(one.password).not.toEqual(two.password);
    });

    it('throws if the email is already in use', async () => {
      await service.signup('a@b.com', 'mypassword');

      await expect(service.signup('a@b.com', 'other')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('signin', () => {
    it('returns the user when the password is correct', async () => {
      const created = await service.signup('a@b.com', 'mypassword');
      const user = await service.signin('a@b.com', 'mypassword');

      expect(user.id).toEqual(created.id);
      expect(user.email).toEqual('a@b.com');
    });

    it('throws if the email is not registered', async () => {
      await expect(
        service.signin('nobody@b.com', 'mypassword'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws if the password is wrong', async () => {
      await service.signup('a@b.com', 'mypassword');

      await expect(service.signin('a@b.com', 'wrongpassword')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequest — not a crash — for a stored password with no salt', async () => {
      // e.g. a legacy plaintext row, or one written by PATCH /auth/:id
      users.push(
        Object.assign(new User(), {
          id: 1,
          email: 'legacy@b.com',
          password: 'plaintext',
        }),
      );

      await expect(service.signin('legacy@b.com', 'plaintext')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
