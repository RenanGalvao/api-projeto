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
import { ReportService } from './report.service';
import { CreateReportDto, UpdateReportDto } from './dto';
import { HardRemoveDto, Public, RestoreDto, User as Jwt } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';

@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post()
  create(@Jwt() user: User, @Body() createReportDto: CreateReportDto) {
    return this.reportService.create(user, createReportDto);
  }

  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.reportService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.reportService.restore(restoreDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Jwt() user: User, @Body() updateReportDto: UpdateReportDto) {
    return this.reportService.update(id, user, updateReportDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.reportService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.reportService.remove(id, user);
  }
}
