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
import { Role } from '@prisma/client';
import { Roles } from 'src/auth/roles';
import { PaginationDto } from 'src/prisma/dto';
import { HardRemoveDto, Public, RestoreDto } from 'src/utils';
import { AssistedFamilyService } from './assisted-family.service';
import { CreateAssistedFamilyDto, UpdateAssistedFamilyDto } from './dto';

@Controller('assisted-family')
export class AssistedFamilyController {
  constructor(private readonly assistedFamilyService: AssistedFamilyService) {}

  @Post()
  create(@Body() createAssistedFamilyDto: CreateAssistedFamilyDto) {
    return this.assistedFamilyService.create(createAssistedFamilyDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.assistedFamilyService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assistedFamilyService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.assistedFamilyService.restore(restoreDto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssistedFamilyDto: UpdateAssistedFamilyDto,
  ) {
    return this.assistedFamilyService.update(id, updateAssistedFamilyDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.assistedFamilyService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assistedFamilyService.remove(id);
  }
}
