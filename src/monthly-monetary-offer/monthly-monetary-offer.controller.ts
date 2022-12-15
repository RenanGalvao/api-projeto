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
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
  User as Jwt,
} from 'src/utils';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';
import { PaginationDto } from 'src/prisma/dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Monthly Monetary Offer')
@Controller('monthly-monetary-offer')
export class MonthlyMonetaryOfferController {
  constructor(
    private readonly monthlyMonetaryOfferService: MonthlyMonetaryOfferService,
  ) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateMonthlyMonetaryOfferDto)
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

  @ApiResponse(CreateMonthlyMonetaryOfferDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.monthlyMonetaryOfferService.findAll(query);
  }

  @ApiResponse(CreateMonthlyMonetaryOfferDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyMonetaryOfferService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.monthlyMonetaryOfferService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateMonthlyMonetaryOfferDto)
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

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyMonetaryOfferService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateMonthlyMonetaryOfferDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.monthlyMonetaryOfferService.remove(id, user);
  }
}
