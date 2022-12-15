import { ApiProperty } from '@nestjs/swagger';
import { OfferorFamilyGroup } from '@prisma/client';
import { IsOptional } from 'class-validator';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateOfferorFamilyDto {
  @IsNotEmpty()
  @IsString()
  representative: string;
  @IsNotEmpty()
  @IsString()
  commitment: string;
  @IsOptional()
  @IsString()
  denomination?: string;
  @ApiProperty({
    enum: OfferorFamilyGroup,
  })
  @IsNotEmpty()
  @IsEnum(OfferorFamilyGroup, Object.keys(OfferorFamilyGroup))
  group: OfferorFamilyGroup;
  @ApiProperty({
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
