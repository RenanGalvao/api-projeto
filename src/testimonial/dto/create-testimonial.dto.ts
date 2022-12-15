import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateTestimonialDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @ApiProperty({
    format: 'email',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  text: string;
  @ApiProperty({
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
