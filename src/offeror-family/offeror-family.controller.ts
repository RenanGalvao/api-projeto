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
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';

@Controller('offeror-family')
export class OfferorFamilyController {
  constructor(private readonly offerorFamilyService: OfferorFamilyService) {}

  @Post()
  create(@Jwt() user: User, @Body() createOfferorFamilyDto: CreateOfferorFamilyDto) {
    return this.offerorFamilyService.create(user, createOfferorFamilyDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.offerorFamilyService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offerorFamilyService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.offerorFamilyService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateOfferorFamilyDto: UpdateOfferorFamilyDto,
  ) {
    return this.offerorFamilyService.update(id, user, updateOfferorFamilyDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.offerorFamilyService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.offerorFamilyService.remove(id, user);
  }
}
