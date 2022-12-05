import { PartialType } from '@nestjs/swagger';
import { CreateOfferorFamilyDto } from './create-offeror-family.dto';

export class UpdateOfferorFamilyDto extends PartialType(CreateOfferorFamilyDto) {}
