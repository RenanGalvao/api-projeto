import { Module } from '@nestjs/common';
import { AgendaService } from './agenda.service';
import { AgendaController } from './agenda.controller';

@Module({
  controllers: [AgendaController],
  providers: [AgendaService]
})
export class AgendaModule {}
