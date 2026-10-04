import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getAllAdmins() {
    return this.adminService.getAllAdmins();
  }

  @Get(':id')
  getAdmin(@Param('id') id: string) {
    return this.adminService.getAdmin(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createAdmin(@Body() admin: CreateAdminDto) {
    return this.adminService.createAdmin(admin);
  }

  @Put(':id')
  updateAdmin(@Param('id') id: string, @Body() admin: UpdateAdminDto) {
    return this.adminService.updateAdmin(id, admin);
  }

  @Delete(':id')
  deleteAdmin(@Param('id') id: string) {
    return this.adminService.deleteAdmin(id);
  }
}
