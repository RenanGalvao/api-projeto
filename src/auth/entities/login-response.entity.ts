import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CreateUserDto } from 'src/user/dto';

class UserResponse extends OmitType(CreateUserDto, ['password'] as const) {
  @ApiProperty()
  id: string;
  @ApiProperty()
  last_access: string;
}

export class LoginResponse {
  @ApiProperty()
  accessToken: string;
  @ApiProperty()
  usuario: UserResponse;
}
