import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../integrations/prisma/prisma.service";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { CreateStudentDto } from "./dto/create-student.dto";

@Injectable()
export class StudentService {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    async getProfile(studUuid: string){
        const student = await this.prisma.student.findUnique({
            where: { 
                studentUuid: studUuid,
                status: true 
            }
        })

        if (!student) throw new NotFoundException('Student not found');    
        return student;
    }

    async getAllProfiles(){
        return await this.prisma.student.findMany({
            skip: 10,
            take: 10,
            orderBy: {
                studentId: 'asc'
            }
        })
    }

    async createProfile(body: CreateStudentDto){
        return this.prisma.$transaction(async (tx) => {
            await tx.student.create({
                data: {
                    studentId: body.studentId,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    middleName: body.middleName,
                    gender: body.genderId ? { connect: { genderId: body.genderId } } : undefined,
                    dob: body.dob ? new Date(body.dob) : undefined,
                    contactNo: body.contactNo,
                    email: body.email,
                    provincialAddr: body.provincialAddr,
                    cityAddr: body.cityAddr,
                    yrAdmitted: body.yrAdmitted,
                    yrResidency: body.yrResidency,
                    yrGraduated: body.yrGraduated,
                    isHd: body.isHd,
                    status: body.status,
                }
            })

            // TODO: Augit logs
            // return tsx.audit_logs.create({
            //   data: {
            //   }  
            // })
        })
    }

    async updateProfile(studUuid: string, body: UpdateStudentDto) {
        const student = await this.prisma.student.findUnique({
            where: { studentUuid: studUuid },
        });
        
        if (!student) throw new NotFoundException('Student not found');

        const updateData: UpdateStudentDto = {
            studentId: body.studentId,
            firstName: body.firstName,
            lastName: body.lastName,
            middleName: body.middleName,
            genderId: body.genderId,
            dob: body.dob ? new Date(body.dob) : undefined,
            contactNo: body.contactNo,
            email: body.email,
            provincialAddr: body.provincialAddr,
            cityAddr: body.cityAddr,
            yrAdmitted: body.yrAdmitted,
            yrResidency: body.yrResidency,
            yrGraduated: body.yrGraduated,
            isHd: body.isHd,
            status: body.status,
        };

        return this.prisma.student.update({
            where: { studentUuid: studUuid },
            data: updateData,
        });
    }

    async deleteProfile(studentUuid: string) {
        return await this.prisma.student.delete({
            where: { studentUuid: studentUuid }
        })
    }

    async deleteMultipleProfile(studentUuids: string[]) {
        return await this.prisma.student.deleteMany({
            where: {
                studentUuid: {
                    in: studentUuids,
                },
            },
        });
    }
}