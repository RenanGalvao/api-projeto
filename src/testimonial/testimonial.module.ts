import { Module } from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { TestimonialController } from './testimonial.controller';

@Module({
  controllers: [TestimonialController],
  providers: [TestimonialService]
})
export class TestimonialModule {}
