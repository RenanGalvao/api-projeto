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
import { VolunteerService } from './volunteer.service';
import { CreateVolunteerDto, UpdateVolunteerDto } from './dto';
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';
import { PaginationDto } from 'src/prisma/dto';

@Controller('volunteer')
export class VolunteerController {
  constructor(private readonly volunteerService: VolunteerService) {}

  @Post()
  create(@Jwt() user: User, @Body() createVolunteerDto: CreateVolunteerDto) {
    return this.volunteerService.create(user, createVolunteerDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.volunteerService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.volunteerService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.volunteerService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateVolunteerDto: UpdateVolunteerDto,
  ) {
    return this.volunteerService.update(id, user, updateVolunteerDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.volunteerService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User,) {
    return this.volunteerService.remove(id, user);
  }
}
