import { IsOptional } from 'class-validator';
import { IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateCollaboratorDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsOptional()
  @IsString()
  image?: string;
  @IsNotEmpty()
  @IsString()
  description: string;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
