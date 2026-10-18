import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class DeleteStudentsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  studentUuids: string[];
}
