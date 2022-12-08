import { Occupation } from '@prisma/client';
import { IsOptional } from 'class-validator';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
} from 'src/utils';

export class CreateVolunteerDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsOptional()
  @IsEmail()
  email?: string;
  @IsOptional()
  @IsString()
  avatar?: string;
  @IsNotEmpty()
  @IsDate()
  joinedDate: Date;
  @IsOptional()
  @IsEnum(Occupation, Object.keys(Occupation))
  occupation?: Occupation;
  @IsOptional()
  @IsString()
  church?: string;
  @IsOptional()
  @IsString()
  priest?: string;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
