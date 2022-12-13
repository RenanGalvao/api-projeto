import { IsOptional } from 'class-validator';
import { IsInt, IsNotEmpty, IsNumber, IsString, IsUUID } from 'src/utils';

export class CreateMonthlyMonetaryOfferDto {
  @IsNotEmpty()
  @IsInt()
  month: number;
  @IsNotEmpty()
  @IsInt()
  year: number;
  @IsNotEmpty()
  @IsNumber()
  openingBalance: number;
  @IsNotEmpty()
  @IsNumber()
  offersValue: number;
  @IsNotEmpty()
  @IsString()
  offersDescription: string;
  @IsNotEmpty()
  @IsNumber()
  spentValue: number;
  @IsNotEmpty()
  @IsString()
  spentDescription: string;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
