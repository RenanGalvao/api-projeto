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
import { OfferorFamilyService } from './offeror-family.service';
import { CreateOfferorFamilyDto, UpdateOfferorFamilyDto } from './dto';
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

@ApiTags('Offeror Family')
@Controller('offeror-family')
export class OfferorFamilyController {
  constructor(private readonly offerorFamilyService: OfferorFamilyService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateOfferorFamilyDto)
  @Post()
  create(
    @Jwt() user: User,
    @Body() createOfferorFamilyDto: CreateOfferorFamilyDto,
  ) {
    return this.offerorFamilyService.create(user, createOfferorFamilyDto);
  }

  @ApiResponse(CreateOfferorFamilyDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.offerorFamilyService.findAll(query);
  }

  @ApiResponse(CreateOfferorFamilyDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offerorFamilyService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.offerorFamilyService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateOfferorFamilyDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateOfferorFamilyDto: UpdateOfferorFamilyDto,
  ) {
    return this.offerorFamilyService.update(id, user, updateOfferorFamilyDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.offerorFamilyService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateOfferorFamilyDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.offerorFamilyService.remove(id, user);
  }
}
