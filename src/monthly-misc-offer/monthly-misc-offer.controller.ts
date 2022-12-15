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
import { Role, User } from '@prisma/client';
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
  User as Jwt,
} from 'src/utils';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Monthly Misc Offer')
@Controller('monthly-misc-offer')
export class MonthlyMiscOfferController {
  constructor(
    private readonly monthlyMiscOfferService: MonthlyMiscOfferService,
  ) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateMonthlyMiscOfferDto)
  @Post()
  create(
    @Jwt() user: User,
    @Body() createMonthlyMiscOfferDto: CreateMonthlyMiscOfferDto,
  ) {
    return this.monthlyMiscOfferService.create(user, createMonthlyMiscOfferDto);
  }

  @ApiResponse(CreateMonthlyMiscOfferDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.monthlyMiscOfferService.findAll(query);
  }

  @ApiResponse(CreateMonthlyMiscOfferDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.monthlyMiscOfferService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.monthlyMiscOfferService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateMonthlyMiscOfferDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateMonthlyMiscOfferDto: UpdateMonthlyMiscOfferDto,
  ) {
    return this.monthlyMiscOfferService.update(
      id,
      user,
      updateMonthlyMiscOfferDto,
    );
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.monthlyMiscOfferService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateMonthlyMiscOfferDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.monthlyMiscOfferService.remove(id, user);
  }
}
