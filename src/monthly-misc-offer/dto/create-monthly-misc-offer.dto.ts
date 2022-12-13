import { IsOptional } from 'class-validator';
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateMonthlyMiscOfferDto {
  @IsNotEmpty()
  @IsInt()
  month: number;
  @IsNotEmpty()
  @IsInt()
  year: number;
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsNotEmpty()
  @IsString()
  description: string;
  @IsNotEmpty()
  @IsString()
  destination: string;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
