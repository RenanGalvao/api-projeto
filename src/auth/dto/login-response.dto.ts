import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsDate, IsString } from 'src/utils';

class UserResponse {
  @ApiProperty({
    format: 'uuid',
  })
  @IsString()
  id: string;
  @IsString()
  firstName: string;
  @IsString()
  lastName: string;
  @ApiProperty({
    format: 'email',
  })
  @IsString()
  email: string;
  @ApiProperty({
    enum: Role,
  })
  role: Role;
  @IsString()
  avatar?: string;
  @IsDate()
  lastAccess: Date;
}

export class LoginResponseDto {
  @IsString()
  acessToken: string;
  @IsString()
  refreshToken: string;
  user: UserResponse;
}
