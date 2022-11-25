import { IsOptional } from 'class-validator';
import { IsString, IsEnum, IsBoolean, IsInt } from 'src/utils/decorator';
import { Prisma } from '@prisma/client';
import { Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @IsInt()
  itemsPerPage?: number;
  @IsOptional()
  @IsInt()
  page?: number;
  @IsOptional()
  @IsBoolean()
  @Transform(params => params.obj.deleted === 'true')
  deleted?: boolean;
  @IsOptional()
  @IsString()
  orderKey?: string;
  @IsOptional()
  @IsEnum(Prisma.SortOrder, Object.keys(Prisma.SortOrder))
  orderValue?: Prisma.SortOrder;
}
