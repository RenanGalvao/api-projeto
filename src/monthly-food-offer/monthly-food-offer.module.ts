import { Module } from '@nestjs/common';
import { MonthlyFoodOfferService } from './monthly-food-offer.service';
import { MonthlyFoodOfferController } from './monthly-food-offer.controller';

@Module({
  controllers: [MonthlyFoodOfferController],
  providers: [MonthlyFoodOfferService]
})
export class MonthlyFoodOfferModule {}
