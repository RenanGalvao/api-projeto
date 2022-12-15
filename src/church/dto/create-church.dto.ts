import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateChurchDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsNotEmpty()
  @IsString()
  description: string;
  @IsNotEmpty()
  @IsString()
  image: string;
  @ApiProperty({
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
