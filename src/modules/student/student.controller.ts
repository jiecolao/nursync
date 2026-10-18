import { 
    Controller, Get, Param, 
    Post, Patch, HttpCode, 
    HttpStatus, Body, Put, Delete, UseGuards
} from "@nestjs/common";
import { StudentService } from "./student.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { DeleteStudentsDto } from "./dto/delete-students.dto";
import { JwtAuthGuard } from "../auth/guards/jwt.guard";
import { RbacGuard } from "../auth/guards/rbac.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";

@Controller('student')
@UseGuards(JwtAuthGuard, RbacGuard)
export class StudentController {
    constructor(private readonly studentService: StudentService) {}

    @Get()
    @RequirePermissions("students_read")
    async getAllProfiles(){
        return this.studentService.getAllProfiles();
    }

    @Get(':id')
    @RequirePermissions("students_read")
    async getProfile(@Param('id') id: string){
        return this.studentService.getProfile(id);
    }

    @Put(':id')
    @RequirePermissions("students_write")
    async updateProfile(@Param('id') id: string, @Body() student: UpdateStudentDto){
        return this.studentService.updateProfile(id, student);
    }

    @Post()
    @RequirePermissions("students_write")
    @HttpCode(HttpStatus.CREATED)
    async createProfile(@Body() student: CreateStudentDto){
        return this.studentService.createProfile(student)
    }

    // @Patch(':id')
    // async updateProfileStatus(@Param('id') id: string, @Body() student: updateStudentStatusDto){
    //     return this.studentService.updateProfileStatus(id, student)
    // }

    @Delete(':id')
    @RequirePermissions("students_write")
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeProfile(@Param('id') id: string) {
        return this.studentService.deleteProfile(id)
    }

    @Delete()
    @RequirePermissions("students_write")
    async removeMultipleProfiles(@Body() body: DeleteStudentsDto) {
        return this.studentService.deleteMultipleProfile(body.studentUuids);
    }
}