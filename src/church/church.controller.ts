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
import { ChurchService } from './church.service';
import { CreateChurchDto, UpdateChurchDto } from './dto';

@ApiTags('Church')
@Controller('church')
export class ChurchController {
  constructor(private readonly churchService: ChurchService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateChurchDto)
  @Post()
  create(@Jwt() user: User, @Body() createChurchDto: CreateChurchDto) {
    return this.churchService.create(user, createChurchDto);
  }

  @ApiResponse(CreateChurchDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.churchService.findAll(query);
  }

  @ApiResponse(CreateChurchDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.churchService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.churchService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateChurchDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateChurchDto: UpdateChurchDto,
  ) {
    return this.churchService.update(id, user, updateChurchDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.churchService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateChurchDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.churchService.remove(id, user);
  }
}
