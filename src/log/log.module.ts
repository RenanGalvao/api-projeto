import { Module } from '@nestjs/common';
import { LogService } from './log.service';
import { LogController } from './log.controller';

@Module({
  controllers: [LogController],
  providers: [LogService],
  exports: [LogService],
})
export class LogModule {}
