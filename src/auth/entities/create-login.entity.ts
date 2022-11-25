import { ApiProperty } from '@nestjs/swagger';

export class CreateLogin {
  @ApiProperty()
  login: string;
  @ApiProperty()
  senha: string;
}
