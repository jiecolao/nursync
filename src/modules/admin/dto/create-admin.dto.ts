import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  facultyId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5)
  suffix?: string;

  @IsOptional()
  @IsInt()
  genderId?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  hashPass: string;

  @IsInt()
  roleId: number;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
