import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Report {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  price!: number;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column()
  year!: number;

  // Must be float: a plain @Column() maps to sqlite `integer`, and TypeORM
  // parseInt()s such columns on read, silently truncating 37.7 to 37.
  @Column({ type: 'float' })
  lng!: number;

  @Column({ type: 'float' })
  lat!: number;

  @Column()
  mileage!: number;

  @Column({ default: false })
  approved!: boolean;

  @ManyToOne(() => User, (user) => user.reports)
  user!: User;
}
