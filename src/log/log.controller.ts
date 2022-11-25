import { Controller, Get, Put, Delete, Param, Query, Body, CacheTTL } from '@nestjs/common';
import { LogService } from './log.service';
import { PaginationDto } from 'src/prisma/dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) { }

  @CacheTTL(1)
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.logService.findAll(query);
  }

  @CacheTTL(1)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.logService.findOne(id);
  }

  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.logService.restore(restoreDto);
  }

  @Delete('clean')
  clean() {
    return this.logService.clean();
  }

  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.logService.hardRemove(hardRemoveDto);
  }
}
