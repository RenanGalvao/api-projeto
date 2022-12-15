import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'src/utils';

export class NewPasswordDto {
  @ApiProperty({
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  token: string;
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;
}
