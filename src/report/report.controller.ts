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
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
  User as Jwt,
} from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { Roles } from 'src/auth/roles';
import { Role, User } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Report')
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateReportDto)
  @Post()
  create(@Jwt() user: User, @Body() createReportDto: CreateReportDto) {
    return this.reportService.create(user, createReportDto);
  }

  @ApiResponse(CreateReportDto, { paginated: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.reportService.findAll(query);
  }

  @ApiResponse(CreateReportDto)
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reportService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.reportService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateReportDto)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Jwt() user: User,
    @Body() updateReportDto: UpdateReportDto,
  ) {
    return this.reportService.update(id, user, updateReportDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.reportService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateReportDto)
  @Delete(':id')
  remove(@Param('id') id: string, @Jwt() user: User) {
    return this.reportService.remove(id, user);
  }
}
