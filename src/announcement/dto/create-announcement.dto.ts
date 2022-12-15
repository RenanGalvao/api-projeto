import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsBoolean, IsDate, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateAnnouncementDto {
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsNotEmpty()
  @IsString()
  message: string;
  @IsOptional()
  @IsString({ each: true })
  attachments?: string[];
  @IsNotEmpty()
  @IsDate()
  date: Date;
  @ApiProperty({
    default: false
  })
  @IsOptional()
  @IsBoolean()
  fixed?: boolean;
  @ApiProperty({
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID('4')
  field?: string;
}
