import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsDate, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateAgendaDto {
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
  @IsOptional()
  @IsUUID('4')
  @ApiProperty({
    type: 'string',
    format: 'uuid',
  })
  field?: string;
}
