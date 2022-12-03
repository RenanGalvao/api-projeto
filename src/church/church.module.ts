import { Module } from '@nestjs/common';
import { ChurchService } from './church.service';
import { ChurchController } from './church.controller';

@Module({
  controllers: [ChurchController],
  providers: [ChurchService]
})
export class ChurchModule {}
