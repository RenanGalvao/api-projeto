import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'src/utils';

export class SendRecoverEmailDto {
  @ApiProperty({
    format: 'email'
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
