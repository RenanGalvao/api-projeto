import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsEmail, IsString, MinLength, MaxLength } from 'src/utils';

export class TokenValidateDto {
  @ApiProperty({
    format: 'email'
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  token: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
