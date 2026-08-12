import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { UsersService } from './users.service';

const scrypt = promisify(_scrypt) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 32;

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async signup(email: string, password: string) {
    const existing = await this.usersService.find(email);

    if (existing.length) {
      throw new BadRequestException('email in use');
    }

    const salt = randomBytes(8).toString('hex');
    const hash = await scrypt(password, salt, KEY_LENGTH);

    return this.usersService.create(email, `${salt}.${hash.toString('hex')}`);
  }

  async signin(email: string, password: string) {
    const [user] = await this.usersService.find(email);

    if (!user) {
      throw new NotFoundException('user not found');
    }

    const [salt, storedHash] = user.password.split('.');

    // Guards against rows whose password was not written by signup() — e.g.
    // legacy plaintext, or a raw value set through PATCH /auth/:id.
    if (!salt || !storedHash) {
      throw new BadRequestException('bad password');
    }

    const hash = await scrypt(password, salt, KEY_LENGTH);
    const stored = Buffer.from(storedHash, 'hex');

    if (
      stored.length !== hash.length ||
      !timingSafeEqual(stored, new Uint8Array(hash))
    ) {
      throw new BadRequestException('bad password');
    }

    return user;
  }
}
