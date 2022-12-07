import { Module } from '@nestjs/common';
import { MonthlyMonetaryOfferService } from './monthly-monetary-offer.service';
import { MonthlyMonetaryOfferController } from './monthly-monetary-offer.controller';

@Module({
  controllers: [MonthlyMonetaryOfferController],
  providers: [MonthlyMonetaryOfferService]
})
export class MonthlyMonetaryOfferModule {}
