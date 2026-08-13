import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateReportDto } from './dtos/create-report.dto';
import { GetEstimateDto } from './dtos/get-estimate.dto';
import { Report } from './report.entity';
import { User } from '../users/user.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly repo: Repository<Report>,
  ) {}

  create(reportDto: CreateReportDto, user: User) {
    const report = this.repo.create(reportDto);
    report.user = user;

    return this.repo.save(report);
  }

  /**
   * Averages the price of up to three approved reports for a comparable car:
   * same make and model, within 5 degrees of the location, within 3 model
   * years, ordered by closest mileage.
   */
  async createEstimate({
    make,
    model,
    lng,
    lat,
    year,
    mileage,
  }: GetEstimateDto) {
    // The three closest matches are selected as rows and averaged here rather
    // than with SQL AVG(). An aggregate collapses the result to a single row
    // before LIMIT applies, so `AVG(price) ... LIMIT 3` would silently average
    // every match instead of the closest three.
    const comparables = await this.repo
      .createQueryBuilder()
      .select('price')
      .where('make = :make', { make })
      .andWhere('model = :model', { model })
      .andWhere('lng - :lng BETWEEN -5 AND 5', { lng })
      .andWhere('lat - :lat BETWEEN -5 AND 5', { lat })
      .andWhere('year - :year BETWEEN -3 AND 3', { year })
      .andWhere('approved = TRUE')
      .orderBy('ABS(mileage - :mileage)', 'ASC')
      .setParameters({ mileage })
      .limit(3)
      .getRawMany<{ price: number }>();

    if (!comparables.length) {
      return { price: null };
    }

    const total = comparables.reduce((sum, row) => sum + row.price, 0);

    return { price: total / comparables.length };
  }

  async changeApproval(id: number, approved: boolean) {
    // The relation is loaded because ReportDto exposes userId — without it the
    // response would silently omit the field that create() returns.
    const report = await this.repo.findOne({
      where: { id },
      relations: { user: true },
    });

    if (!report) {
      throw new NotFoundException('report not found');
    }

    report.approved = approved;

    return this.repo.save(report);
  }
}
