import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  userAccId: string;

  @IsInt()
  roleId: number;

  @IsString()
  @IsNotEmpty()
  action: string;
}
