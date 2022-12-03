import { PartialType } from '@nestjs/swagger';
import { CreateChurchDto } from './create-church.dto';

export class UpdateChurchDto extends PartialType(CreateChurchDto) {}
