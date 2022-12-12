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
import { CollaboratorService } from './collaborator.service';
import { CreateCollaboratorDto, UpdateCollaboratorDto } from './dto';

@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  create(@Jwt() user: User, @Body() createCollaboratorDto: CreateCollaboratorDto) {
    return this.collaboratorService.create(user, createCollaboratorDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.collaboratorService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collaboratorService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.collaboratorService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateCollaboratorDto: UpdateCollaboratorDto,
  ) {
    return this.collaboratorService.update(id, user, updateCollaboratorDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.collaboratorService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.collaboratorService.remove(id, user);
  }
}
