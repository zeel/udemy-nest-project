import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, beforeEach, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

const makeUser = (id: number, email = 'a@b.com', password = 'hashed') =>
  Object.assign(new User(), { id, email, password });

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
    findBy: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn((attrs: any) => Object.assign(new User(), attrs)),
      save: jest.fn((user: any) => Promise.resolve(user)),
      findOneBy: jest.fn(() => Promise.resolve(null)),
      findBy: jest.fn(() => Promise.resolve([])),
      remove: jest.fn((user: any) => Promise.resolve(user)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('create builds an entity and saves it', async () => {
    const user = await service.create('a@b.com', 'hashed');

    expect(repo.create).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'hashed',
    });
    expect(repo.save).toHaveBeenCalled();
    expect(user.email).toEqual('a@b.com');
  });

  it('findOne short-circuits on a falsy id without querying', async () => {
    // findOneBy({ id: undefined }) would drop the condition and return the
    // first row in the table, so the guard must run before the query.
    await expect(service.findOne(0)).resolves.toBeNull();
    expect(repo.findOneBy).not.toHaveBeenCalled();
  });

  it('findOne queries by id', async () => {
    repo.findOneBy.mockResolvedValue(makeUser(1) as never);

    await expect(service.findOne(1)).resolves.toMatchObject({ id: 1 });
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('find queries by email', async () => {
    repo.findBy.mockResolvedValue([makeUser(1)] as never);

    await expect(service.find('a@b.com')).resolves.toHaveLength(1);
    expect(repo.findBy).toHaveBeenCalledWith({ email: 'a@b.com' });
  });

  it('update merges attributes and saves the entity', async () => {
    repo.findOneBy.mockResolvedValue(makeUser(1, 'old@b.com') as never);

    const user = await service.update(1, { email: 'new@b.com' });

    expect(user.email).toEqual('new@b.com');
    // save() rather than repo.update() so the entity's @AfterUpdate hook fires
    expect(repo.save).toHaveBeenCalled();
  });

  it('update throws NotFoundException for a missing id', async () => {
    await expect(service.update(9999, { email: 'x@y.com' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove deletes the fetched entity', async () => {
    const existing = makeUser(1);
    repo.findOneBy.mockResolvedValue(existing as never);

    await service.remove(1);

    // remove() rather than repo.delete() so @AfterRemove fires
    expect(repo.remove).toHaveBeenCalledWith(existing);
  });

  it('remove throws NotFoundException for a missing id', async () => {
    await expect(service.remove(9999)).rejects.toThrow(NotFoundException);
  });
});
