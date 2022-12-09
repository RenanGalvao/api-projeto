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
import { AgendaService } from './agenda.service';
import { CreateAgendaDto, UpdateAgendaDto } from './dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  create(@Jwt() user: User, @Body() createAgendaDto: CreateAgendaDto) {
    return this.agendaService.create(user, createAgendaDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.agendaService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.agendaService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateAgendaDto: UpdateAgendaDto,
  ) {
    return this.agendaService.update(id, user, updateAgendaDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.agendaService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.agendaService.remove(id, user);
  }
}
