import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { IsArray, IsNotEmpty, IsObject, IsString } from 'src/utils';
import {
  MapOptions,
  PolygonOptions,
  CollectionPoints,
} from 'src/utils/google-maps/classes';

import {
  MapOptions as MapOptionsType,
  PolygonOptions as PolygonOptionsType,
  CollectionPoints as CollectionPointsType,
} from 'src/utils/google-maps/types';

export class CreateFieldDto {
  @IsNotEmpty()
  @IsString()
  continent: string;
  @IsNotEmpty()
  @IsString()
  country: string;
  @IsNotEmpty()
  @IsString()
  state: string;
  @IsNotEmpty()
  @IsString()
  abbreviation: string;
  @IsNotEmpty()
  @IsString()
  designation: string;
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MapOptions)
  mapLocation?: MapOptionsType;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolygonOptions)
  mapArea?: PolygonOptionsType[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectionPoints)
  collectionPoints?: CollectionPointsType[];
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  streetRelation?: string[];
}
