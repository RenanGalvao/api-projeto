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
import { MonthlyFoodOfferService } from './monthly-food-offer.service';
import { CreateMonthlyFoodOfferDto, UpdateMonthlyFoodOfferDto } from './dto';
import { HardRemoveDto, Public, RestoreDto } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';

@Controller('monthly-food-offer')
export class MonthlyFoodOfferController {
  constructor(
    private readonly monthlyFoodOfferService: MonthlyFoodOfferService,
  ) {}

  @Post()
  create(@Body() createMonthlyFoodOfferDto: CreateMonthlyFoodOfferDto) {
    return this.monthlyFoodOfferService.create(createMonthlyFoodOfferDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.monthlyFoodOfferService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyFoodOfferService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.monthlyFoodOfferService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateMonthlyFoodOfferDto: UpdateMonthlyFoodOfferDto,
  ) {
    return this.monthlyFoodOfferService.update(id, updateMonthlyFoodOfferDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyFoodOfferService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monthlyFoodOfferService.remove(id);
  }
}
