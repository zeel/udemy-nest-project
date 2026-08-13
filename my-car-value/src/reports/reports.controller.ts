import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../guards/admin.guard';
import { AuthGuard } from '../guards/auth.guard';
import { Serialize } from '../interceptors/serialize.interceptor';
import { CurrentUser } from '../users/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { ApproveReportDto } from './dtos/approve-report.dto';
import { CreateReportDto } from './dtos/create-report.dto';
import { GetEstimateDto } from './dtos/get-estimate.dto';
import { ReportDto } from './dtos/report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Deliberately not @Serialize(ReportDto): this returns { price }, not a
  // report, so running it through the report DTO would be misleading.
  @Get()
  getEstimate(@Query() query: GetEstimateDto) {
    return this.reportsService.createEstimate(query);
  }

  @Post()
  @Serialize(ReportDto)
  @UseGuards(AuthGuard)
  createReport(@Body() body: CreateReportDto, @CurrentUser() user: User | null) {
    // AuthGuard proves a session exists, not that its user still does — the
    // row can be deleted while the cookie remains valid.
    if (!user) {
      throw new UnauthorizedException('user no longer exists');
    }

    return this.reportsService.create(body, user);
  }

  @Patch(':id')
  @Serialize(ReportDto)
  @UseGuards(AdminGuard)
  approveReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ApproveReportDto,
  ) {
    return this.reportsService.changeApproval(id, body.approved);
  }
}
