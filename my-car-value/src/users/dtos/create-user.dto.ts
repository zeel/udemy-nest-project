import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsEmail()
  email!: string;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @IsString()
  password!: string;
}
