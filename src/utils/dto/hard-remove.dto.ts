import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsArray } from 'src/utils';

export class HardRemoveDto {
  @ApiProperty({
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
