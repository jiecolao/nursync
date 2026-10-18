import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Matches, MinLength, MaxLength } from 'class-validator';
export class CreateAdminDto {
  @IsOptional() @IsString() @MaxLength(64) userId?: string;
  @IsOptional() @IsString() @MaxLength(20) facultyId?: string;
  @IsString() @IsNotEmpty() @MaxLength(255) lastName: string;
  @IsString() @IsNotEmpty() @MaxLength(255) fastName: string;
  @IsOptional() @IsString() @MaxLength(255) middleName?: string;
  @IsOptional() @IsString() @MaxLength(5) suffix?: string;
  @IsOptional() @IsInt() genderId?: number;
  @IsString() @IsNotEmpty() @MaxLength(64) username: string;
  @IsEmail() @IsNotEmpty() email: string;
  @IsOptional() @IsString() @MinLength(12, { message: 'Password must be at least 12 characters long' }) @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, { message: 'Password is too weak. It must include uppercase, lowercase, and numbers/special characters.' })
  password?: string;
  @IsOptional() @IsString() @MaxLength(255) hashedRefreshToken?: string;
  @IsInt() roleId: number;
  @IsOptional() @IsBoolean() status?: boolean;
  @IsOptional() @IsObject() permissions?: Record<string, boolean>;
}