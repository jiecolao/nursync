import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards, Req,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Express } from 'express';
import type { Request } from 'express';
type AuthenticatedRequest = Request & { user: { sub: string } };
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { RequirePermissions, RequireRoles } from '../auth/decorators/permissions.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Put('me/profile')
  updateOwnProfile(@Body() admin: UpdateAdminDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.updateOwnProfile(req.user.sub, admin);
  }

  @Put('me/profile-photo')
  @UseInterceptors(FileInterceptor('photo', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      callback(null, /^image\/(jpeg|png|gif|webp|bmp|avif)$/i.test(file.mimetype));
    },
  }))
  updateOwnProfilePhoto(
    @UploadedFile() photo: Express.Multer.File | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.adminService.updateOwnProfilePhoto(req.user.sub, photo);
  }

  @Put('me/password')
  updateOwnPassword(@Body() body: ChangePasswordDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.updateOwnPassword(req.user.sub, body.currentPassword, body.newPassword);
  }

  @Put('me/status')
  updateOwnStatus(@Body() body: UpdateStatusDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.updateOwnStatus(req.user.sub, body.status);
  }

  @Get()
  @RequirePermissions('user_read')
  getAllAdmins() { return this.adminService.getAllAdmins(); }

  @Get(':id')
  @RequirePermissions('user_read')
  getAdmin(@Param('id') id: string) { return this.adminService.getAdmin(id); }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('user_write')
  createAdmin(@Body() admin: CreateAdminDto, @Req() req: AuthenticatedRequest) { return this.adminService.createAdmin(admin, req.user.sub); }

  @Put(':id')
  @RequirePermissions('user_write')
  updateAdmin(@Param('id') id: string, @Body() admin: UpdateAdminDto, @Req() req: AuthenticatedRequest) { return this.adminService.updateAdmin(id, admin, req.user.sub); }

  @Put(':id/status')
  @RequirePermissions('user_write')
  updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.updateStatus(id, body.status, req.user.sub);
  }

  @Delete(':id')
  @RequireRoles('Superadmin')
  deleteAdmin(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.adminService.deleteAdmin(id, req.user.sub); }
}
