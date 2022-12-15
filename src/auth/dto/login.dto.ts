import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, MinLength } from "src/utils";

export class LoginDto {
  @ApiProperty({
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}