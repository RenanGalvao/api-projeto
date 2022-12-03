import { PartialType } from '@nestjs/swagger';
import { CreateAssistedFamilyDto } from './create-assisted-family.dto';

export class UpdateAssistedFamilyDto extends PartialType(CreateAssistedFamilyDto) {}
