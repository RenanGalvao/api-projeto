import { IsOptional } from 'class-validator';
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateTestimonialDto {
  @IsNotEmpty()
  @IsString()
  name: string;
  @IsNotEmpty()
  @IsEmail()
  email: string;
  @IsNotEmpty()
  @IsString()
  text: string;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
