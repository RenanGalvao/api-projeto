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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { PaginationDto } from 'src/prisma/dto';
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
} from 'src/utils/swagger';
import { AgendaService } from './agenda.service';
import { CreateAgendaDto, UpdateAgendaDto } from './dto';

@ApiTags('Agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateAgendaDto)
  @Post()
  create(@Jwt() user: User, @Body() createAgendaDto: CreateAgendaDto) {
    return this.agendaService.create(user, createAgendaDto);
  }

  @ApiResponse(CreateAgendaDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.agendaService.findAll(query);
  }

  @ApiResponse(CreateAgendaDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.agendaService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateAgendaDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateAgendaDto: UpdateAgendaDto,
  ) {
    return this.agendaService.update(id, user, updateAgendaDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.agendaService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateAgendaDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.agendaService.remove(id, user);
  }
}
