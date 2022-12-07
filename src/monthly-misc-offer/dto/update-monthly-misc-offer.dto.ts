import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyMiscOfferDto } from './create-monthly-misc-offer.dto';

export class UpdateMonthlyMiscOfferDto extends PartialType(CreateMonthlyMiscOfferDto) {}
