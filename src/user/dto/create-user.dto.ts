import { IsOptional } from 'class-validator';
import { IsNotEmpty, IsString, IsEmail, IsEnum, MinLength } from 'src/utils';
import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({ enum: Role })
  @IsOptional()
  @IsEnum(Role, Object.values(Role))
  role?: Role;
  @IsOptional()
  @IsString()
  avatar?: string;
}
