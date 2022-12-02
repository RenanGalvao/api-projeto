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
  attachments?: string;
  @IsNotEmpty()
  @IsDate()
  date: Date;
  @IsNotEmpty()
  @IsUUID('4')
  field: string;
}
