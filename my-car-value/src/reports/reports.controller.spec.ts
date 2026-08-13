import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from '@jest/globals';
import { UnauthorizedException } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './report.entity';
import { User } from '../users/user.entity';
import { CreateReportDto } from './dtos/create-report.dto';

const dto: CreateReportDto = {
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  mileage: 30000,
  lng: -122.4,
  lat: 37.7,
  price: 15000,
};

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const fakeReportsService: Partial<ReportsService> = {
      create: (reportDto: CreateReportDto, user: User) =>
        Promise.resolve(Object.assign(new Report(), reportDto, { id: 1, user })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: fakeReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('creates a report owned by the current user', async () => {
    const user = Object.assign(new User(), { id: 7, email: 'a@b.com' });

    const report = await controller.createReport(dto, user);

    expect(report.id).toEqual(1);
    expect(report.make).toEqual('Toyota');
    expect(report.user).toEqual(user);
  });

  it('rejects when the session outlives the user row', () => {
    // AuthGuard only proves a session exists, so currentUser can still be null
    expect(() => controller.createReport(dto, null)).toThrow(
      UnauthorizedException,
    );
  });
});
