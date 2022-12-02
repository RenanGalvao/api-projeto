import { Module } from '@nestjs/common';
import { FieldService } from './field.service';
import { FieldController } from './field.controller';

@Module({
  controllers: [FieldController],
  providers: [FieldService]
})
export class FieldModule {}
