import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyMonetaryOfferDto } from './create-monthly-monetary-offer.dto';

export class UpdateMonthlyMonetaryOfferDto extends PartialType(CreateMonthlyMonetaryOfferDto) {}
