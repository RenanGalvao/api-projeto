import { IsNotEmpty, IsUUID, IsArray } from 'src/utils';

export class RestoreDto {
  @IsNotEmpty()
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
