import {
  IsString, IsNotEmpty, IsOptional,
  IsEmail, IsInt, IsBoolean,
  IsDate, MaxLength, Min, Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStudentDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  studentId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;

  @IsOptional()
  @IsInt()
  genderId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dob?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  contactNo?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  provincialAddr?: string;

  @IsOptional()
  @IsString()
  cityAddr?: string;

  @IsInt()
  @Min(1900)
  @Max(2100)
  yrAdmitted: number;

  @IsInt()
  yrResidency: number;

  @IsOptional()
  @IsInt()
  yrGraduated?: number;

  @IsOptional()
  @IsBoolean()
  isHd?: boolean;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}