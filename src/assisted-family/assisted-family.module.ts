import { Module } from '@nestjs/common';
import { AssistedFamilyService } from './assisted-family.service';
import { AssistedFamilyController } from './assisted-family.controller';

@Module({
  controllers: [AssistedFamilyController],
  providers: [AssistedFamilyService]
})
export class AssistedFamilyModule {}
