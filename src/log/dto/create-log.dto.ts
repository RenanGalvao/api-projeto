import { User } from '@prisma/client';
import { IsOptional } from 'class-validator';
import { IsNotEmpty, IsString, IsObject, IsArray } from 'src/utils';

export class CreateLogDto {
  @IsNotEmpty()
  @IsString()
  ip: string;
  @IsNotEmpty()
  @IsString()
  method: string;
  @IsNotEmpty()
  @IsString()
  url: string;
  @IsOptional()
  @IsObject()
  body?: any;
  @IsOptional()
  @IsString()
  query?: string;
  @IsNotEmpty()
  @IsString()
  statusCode: string;
  @IsOptional()
  @IsObject()
  user?: User;
  @IsOptional()
  @IsArray()
  files?: string[];
}
