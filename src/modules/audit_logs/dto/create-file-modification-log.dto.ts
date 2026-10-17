import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFileModificationLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  userAccId: string;

  @IsInt()
  roleId: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  studentName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fileAction: string;

  @IsString()
  @IsNotEmpty()
  fileModified: string;

  @IsString()
  @IsNotEmpty()
  fileLoc: string;
}
