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
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';

@Controller('monthly-food-offer')
export class MonthlyFoodOfferController {
  constructor(
    private readonly monthlyFoodOfferService: MonthlyFoodOfferService,
  ) {}

  @Post()
  create(@Jwt() user: User, @Body() createMonthlyFoodOfferDto: CreateMonthlyFoodOfferDto) {
    return this.monthlyFoodOfferService.create(user, createMonthlyFoodOfferDto);
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
    @Jwt() user: User,
    @Body() updateMonthlyFoodOfferDto: UpdateMonthlyFoodOfferDto,
  ) {
    return this.monthlyFoodOfferService.update(id, user, updateMonthlyFoodOfferDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyFoodOfferService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.monthlyFoodOfferService.remove(id, user);
  }
}
