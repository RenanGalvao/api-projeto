import { IsInt, IsString } from 'src/utils';

export class FileResponseDto {
  @IsString()
  name: string;
  @IsString()
  mimeType: string;
  @IsInt()
  size: number;
}
