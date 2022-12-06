import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto, UpdateTestimonialDto } from './dto';
import { PaginationDto } from 'src/prisma/dto';
import { HardRemoveDto, Public, RestoreDto } from 'src/utils';
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/roles';

@Controller('testimonial')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @Post()
  create(@Body() createTestimonialDto: CreateTestimonialDto) {
    return this.testimonialService.create(createTestimonialDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.testimonialService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonialService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.testimonialService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
  ) {
    return this.testimonialService.update(id, updateTestimonialDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.testimonialService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.testimonialService.remove(id);
  }
}
