import { IsOptional } from 'class-validator';
import { IsArray, IsDate, IsNotEmpty, IsString, IsUUID } from 'src/utils';

export class CreateReportDto {
  @IsNotEmpty()
  @IsString()
  title: string;
  @IsOptional()
  @IsString()
  text?: string;
  @IsNotEmpty()
  @IsString()
  shortDescription: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
  @IsNotEmpty()
  @IsDate()
  date: Date;
  @IsNotEmpty()
  @IsUUID('4')
  field: string;
}
