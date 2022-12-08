import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsString, MinLength } from 'src/utils';
import { CreateUserDto } from './create-user.dto';

export class MeUpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'field'] as const),
) {
  @IsOptional()
  @MinLength(8)
  @IsString()
  password?: string;
}
