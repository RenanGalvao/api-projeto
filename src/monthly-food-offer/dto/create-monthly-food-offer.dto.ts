import { IsOptional } from 'class-validator';
import { IsInt, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateMonthlyFoodOfferDto {
  @IsNotEmpty()
  @IsInt()
  month: number;
  @IsNotEmpty()
  @IsInt()
  year: number;
  @IsNotEmpty()
  @IsString()
  food: string;
  @IsNotEmpty()
  @IsInt()
  communityCollection: number;
  @IsNotEmpty()
  @IsInt()
  communityCollectionExternal: number;
  @IsNotEmpty()
  @IsInt()
  communityCollectionExtra: number;
  @IsNotEmpty()
  @IsInt()
  churchCollection: number;
  @IsNotEmpty()
  @IsInt()
  churchCollectionExternal: number;
  @IsNotEmpty()
  @IsInt()
  churchCollectionExtra: number;
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
