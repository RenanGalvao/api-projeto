import { PartialType } from '@nestjs/swagger';
import { CreateMonthlyFoodOfferDto } from './create-monthly-food-offer.dto';

export class UpdateMonthlyFoodOfferDto extends PartialType(CreateMonthlyFoodOfferDto) {}
