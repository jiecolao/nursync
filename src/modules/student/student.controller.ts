import { 
    Controller, Get, Param, 
    Post, Patch, HttpCode, 
    HttpStatus, Body, Put, Delete
} from "@nestjs/common";
import { StudentService } from "./student.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Controller('student')
export class StudentController {
    constructor(private readonly studentService: StudentService) {}

    @Get()
    async getAllProfiles(){
        return this.studentService.getAllProfiles();
    }

    @Get(':id')
    async getProfile(@Param('id') id: string){
        return this.studentService.getProfile(id);
    }

    @Put(':id')
    async updateProfile(@Param('id') id: string, @Body() student: UpdateStudentDto){
        return this.studentService.updateProfile(id, student);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createProfile(@Body() student: CreateStudentDto){
        return this.studentService.createProfile(student)
    }

    // @Patch(':id')
    // async updateProfileStatus(@Param('id') id: string, @Body() student: updateStudentStatusDto){
    //     return this.studentService.updateProfileStatus(id, student)
    // }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeProfile(@Param('id') id: string) {
        return this.studentService.deleteProfile(id)
    }
}