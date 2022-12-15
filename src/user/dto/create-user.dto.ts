import { IsOptional, ValidateIf } from 'class-validator';
import {
  IsNotEmpty,
  IsUUID,
  IsString,
  IsEmail,
  IsEnum,
  MinLength,
} from 'src/utils';
import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;
  @IsOptional()
  @IsString()
  lastName?: string;
  @ApiProperty({ format: 'email' })
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
  @ApiProperty({
    format: 'uuid',
  })
  @ValidateIf((o: CreateUserDto) => !o.role || o.role !== Role.ADMIN)
  @IsUUID('4')
  field?: string;
}
