import { Module } from '@nestjs/common';
import { MonthlyMiscOfferService } from './monthly-misc-offer.service';
import { MonthlyMiscOfferController } from './monthly-misc-offer.controller';

@Module({
  controllers: [MonthlyMiscOfferController],
  providers: [MonthlyMiscOfferService]
})
export class MonthlyMiscOfferModule {}
