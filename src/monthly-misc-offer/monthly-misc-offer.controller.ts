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
import { MonthlyMiscOfferService } from './monthly-misc-offer.service';
import { CreateMonthlyMiscOfferDto, UpdateMonthlyMiscOfferDto } from './dto';
import { PaginationDto } from 'src/prisma/dto';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';
import { HardRemoveDto, Public, RestoreDto } from 'src/utils';

@Controller('monthly-misc-offer')
export class MonthlyMiscOfferController {
  constructor(
    private readonly monthlyMiscOfferService: MonthlyMiscOfferService,
  ) {}

  @Post()
  create(@Body() createMonthlyMiscOfferDto: CreateMonthlyMiscOfferDto) {
    return this.monthlyMiscOfferService.create(createMonthlyMiscOfferDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.monthlyMiscOfferService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyMiscOfferService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.monthlyMiscOfferService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateMonthlyMiscOfferDto: UpdateMonthlyMiscOfferDto,
  ) {
    return this.monthlyMiscOfferService.update(id, updateMonthlyMiscOfferDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyMiscOfferService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.monthlyMiscOfferService.remove(id);
  }
}
