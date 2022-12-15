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
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
  User as Jwt,
} from 'src/utils';
import { Role, User } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Testimonial')
@Controller('testimonial')
export class TestimonialController {
  constructor(private readonly testimonialService: TestimonialService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateTestimonialDto)
  @Post()
  create(
    @Jwt() user: User,
    @Body() createTestimonialDto: CreateTestimonialDto,
  ) {
    return this.testimonialService.create(user, createTestimonialDto);
  }

  @ApiResponse(CreateTestimonialDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.testimonialService.findAll(query);
  }

  @ApiResponse(CreateTestimonialDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.testimonialService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.testimonialService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateTestimonialDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
  ) {
    return this.testimonialService.update(id, user, updateTestimonialDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.testimonialService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateTestimonialDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.testimonialService.remove(id, user);
  }
}
