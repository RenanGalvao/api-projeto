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
import { Role, User } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { PaginationDto } from 'src/prisma/dto';
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import { ChurchService } from './church.service';
import { CreateChurchDto, UpdateChurchDto } from './dto';

@Controller('church')
export class ChurchController {
  constructor(private readonly churchService: ChurchService) {}

  @Post()
  create(@Jwt() user: User, @Body() createChurchDto: CreateChurchDto) {
    return this.churchService.create(user, createChurchDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.churchService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.churchService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.churchService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateChurchDto: UpdateChurchDto,
  ) {
    return this.churchService.update(id, user, updateChurchDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.churchService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.churchService.remove(id, user);
  }
}
