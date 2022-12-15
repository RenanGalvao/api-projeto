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
import { AssistedFamilyService } from './assisted-family.service';
import { CreateAssistedFamilyDto, UpdateAssistedFamilyDto } from './dto';

@ApiTags('Assisted Family')
@Controller('assisted-family')
export class AssistedFamilyController {
  constructor(private readonly assistedFamilyService: AssistedFamilyService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateAssistedFamilyDto)
  @Post()
  create(
    @Jwt() user: User,
    @Body() createAssistedFamilyDto: CreateAssistedFamilyDto,
  ) {
    return this.assistedFamilyService.create(user, createAssistedFamilyDto);
  }

  @ApiResponse(CreateAssistedFamilyDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.assistedFamilyService.findAll(query);
  }

  @ApiResponse(CreateAssistedFamilyDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assistedFamilyService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.assistedFamilyService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateAssistedFamilyDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateAssistedFamilyDto: UpdateAssistedFamilyDto,
  ) {
    return this.assistedFamilyService.update(id, user, updateAssistedFamilyDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.assistedFamilyService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateAssistedFamilyDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.assistedFamilyService.remove(id, user);
  }
}
