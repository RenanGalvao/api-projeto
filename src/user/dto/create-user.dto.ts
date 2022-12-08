import { IsOptional, ValidateIf } from 'class-validator';
import { IsNotEmpty, IsUUID, IsString, IsEmail, IsEnum, MinLength } from 'src/utils';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  firstName?: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @MinLength(8)
  @IsString()
  password: string;
  @IsOptional()
  @IsEnum(Role, Object.values(Role))
  role?: Role;
  @IsOptional()
  @IsString()
  avatar?: string;
  @ValidateIf((o: CreateUserDto) => !o.role || o.role !== Role.ADMIN)
  @IsUUID('4')
  field?: string;
}
