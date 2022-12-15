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
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
  User as Jwt,
} from 'src/utils';
import { CollaboratorService } from './collaborator.service';
import { CreateCollaboratorDto, UpdateCollaboratorDto } from './dto';

@ApiTags('Collaborator')
@Controller('collaborator')
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateCollaboratorDto)
  @Post()
  create(
    @Jwt() user: User,
    @Body() createCollaboratorDto: CreateCollaboratorDto,
  ) {
    return this.collaboratorService.create(user, createCollaboratorDto);
  }

  @ApiResponse(CreateCollaboratorDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.collaboratorService.findAll(query);
  }

  @ApiResponse(CreateCollaboratorDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collaboratorService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.collaboratorService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateCollaboratorDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateCollaboratorDto: UpdateCollaboratorDto,
  ) {
    return this.collaboratorService.update(id, user, updateCollaboratorDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.collaboratorService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateCollaboratorDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.collaboratorService.remove(id, user);
  }
}
