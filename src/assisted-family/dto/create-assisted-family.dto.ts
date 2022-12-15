import { ApiProperty } from '@nestjs/swagger';
import { AssistedFamilyGroup } from '@prisma/client';
import { IsOptional } from 'class-validator';
import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateAssistedFamilyDto {
  @IsNotEmpty()
  @IsString()
  representative: string;
  @IsNotEmpty()
  @IsString()
  period: string;
  @ApiProperty({
    enum: AssistedFamilyGroup
  })
  @IsNotEmpty()
  @IsEnum(AssistedFamilyGroup, Object.keys(AssistedFamilyGroup))
  group: AssistedFamilyGroup;
  @ApiProperty({
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
