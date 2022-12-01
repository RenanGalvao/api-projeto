import { Module } from '@nestjs/common';
import { VolunteerService } from './volunteer.service';
import { VolunteerController } from './volunteer.controller';

@Module({
  controllers: [VolunteerController],
  providers: [VolunteerService],
})
export class VolunteerModule {}
