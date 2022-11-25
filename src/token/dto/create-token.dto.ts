import { TokenType } from '@prisma/client';
import { IsEmail, IsNotEmpty, IsEnum } from 'src/utils';

export class CreateTokenDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsEnum(TokenType, Object.values(TokenType))
  token_type: TokenType;
}
