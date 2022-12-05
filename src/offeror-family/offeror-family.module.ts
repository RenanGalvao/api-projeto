import { Module } from '@nestjs/common';
import { OfferorFamilyService } from './offeror-family.service';
import { OfferorFamilyController } from './offeror-family.controller';

@Module({
  controllers: [OfferorFamilyController],
  providers: [OfferorFamilyService]
})
export class OfferorFamilyModule {}
