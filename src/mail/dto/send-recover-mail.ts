import { IsEmail, IsNotEmpty } from 'src/utils';

export class SendRecoverEmailDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;
}
