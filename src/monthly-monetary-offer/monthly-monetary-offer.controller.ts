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
import { MonthlyMonetaryOfferService } from './monthly-monetary-offer.service';
import {
  CreateMonthlyMonetaryOfferDto,
  UpdateMonthlyMonetaryOfferDto,
} from './dto';
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';
import { PaginationDto } from 'src/prisma/dto';

@Controller('monthly-monetary-offer')
export class MonthlyMonetaryOfferController {
  constructor(
    private readonly monthlyMonetaryOfferService: MonthlyMonetaryOfferService,
  ) {}

  @Post()
  create(
    @Jwt() user: User,
    @Body() createMonthlyMonetaryOfferDto: CreateMonthlyMonetaryOfferDto,
  ) {
    return this.monthlyMonetaryOfferService.create(
      user,
      createMonthlyMonetaryOfferDto,
    );
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.monthlyMonetaryOfferService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyMonetaryOfferService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.monthlyMonetaryOfferService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateMonthlyMonetaryOfferDto: UpdateMonthlyMonetaryOfferDto,
  ) {
    return this.monthlyMonetaryOfferService.update(
      id,
      user,
      updateMonthlyMonetaryOfferDto,
    );
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyMonetaryOfferService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.monthlyMonetaryOfferService.remove(id, user);
  }
}
