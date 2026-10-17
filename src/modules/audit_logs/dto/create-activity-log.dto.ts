import { IsInt, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateActivityLogDto {
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
