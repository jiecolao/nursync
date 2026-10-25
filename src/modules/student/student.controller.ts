import {
  Controller, Get, Param, Post, HttpCode, HttpStatus, Body, Put, Delete, UseGuards, Req, BadRequestException,
} from "@nestjs/common";
import type { Request } from 'express';
import { StudentService } from "./student.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { DeleteStudentsDto } from "./dto/delete-students.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { RbacGuard } from "../auth/guards/rbac.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

type AuthenticatedRequest = Request & { user: { sub: string } };

@Controller('student')
@UseGuards(JwtAuthGuard, RbacGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @RequirePermissions("students_read")
  getAllProfiles() { return this.studentService.getAllProfiles(); }

  @Get('archived')
  @RequirePermissions("students_read")
  getArchivedProfiles() { return this.studentService.getArchivedProfiles(); }

  @Put(':id/status')
  @RequirePermissions("students_write")
  setStudentStatus(@Param('id') id: string, @Body() body: { status: boolean }, @Req() req: AuthenticatedRequest) {
    if (typeof body?.status !== 'boolean') {
      throw new BadRequestException('Status must be a boolean.');
    }
    return this.studentService.setStudentStatus(id, body.status, req.user.sub);
  }

  @Get(':id')
  @RequirePermissions("students_read")
  getProfile(@Param('id') id: string) { return this.studentService.getProfile(id); }

  @Put(':id')
  @RequirePermissions("students_write")
  updateProfile(@Param('id') id: string, @Body() student: UpdateStudentDto, @Req() req: AuthenticatedRequest) {
    return this.studentService.updateProfile(id, student, req.user.sub);
  }

  @Post()
  @RequirePermissions("students_write")
  @HttpCode(HttpStatus.CREATED)
  createProfile(@Body() student: CreateStudentDto, @Req() req: AuthenticatedRequest) {
    return this.studentService.createProfile(student, req.user.sub);
  }

  @Delete(':id')
  @RequirePermissions("students_write")
  @HttpCode(HttpStatus.NO_CONTENT)
  removeProfile(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.studentService.deleteProfile(id, req.user.sub);
  }

  @Delete()
  @RequirePermissions("students_write")
  removeMultipleProfiles(@Body() body: DeleteStudentsDto, @Req() req: AuthenticatedRequest) {
    return this.studentService.deleteMultipleProfile(body.studentUuids, req.user.sub);
  }
}