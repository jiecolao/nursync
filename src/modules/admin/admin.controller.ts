import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions, RequireRoles } from '../auth/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @RequirePermissions('user_read')
  getAllAdmins() { return this.adminService.getAllAdmins(); }

  @Get(':id')
  @RequirePermissions('user_read')
  getAdmin(@Param('id') id: string) { return this.adminService.getAdmin(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user_write')
  createAdmin(@Body() admin: CreateAdminDto) { return this.adminService.createAdmin(admin); }

  @Put(':id')
  @RequirePermissions('user_write')
  updateAdmin(@Param('id') id: string, @Body() admin: UpdateAdminDto) { return this.adminService.updateAdmin(id, admin); }

  @Delete(':id')
  @RequireRoles('Superadmin')
  deleteAdmin(@Param('id') id: string) { return this.adminService.deleteAdmin(id); }
}
