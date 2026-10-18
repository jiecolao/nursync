import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RbacGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @RequirePermissions('students_read')
  getSummary() {
    return this.dashboardService.getSummary();
  }

  @Get('recent-changes')
  @RequirePermissions('logs_read')
  getRecentFileChanges(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.dashboardService.getRecentFileChanges(limit);
  }
}
