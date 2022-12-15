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
import { FieldService } from './field.service';
import { CreateFieldDto, UpdateFieldDto } from './dto';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiResponse,
  HardRemoveDto,
  Public,
  RestoreDto,
} from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Field')
@Controller('field')
export class FieldController {
  constructor(private readonly fieldService: FieldService) {}

  @ApiBearerAuth()
  @ApiCreatedResponse(CreateFieldDto, { omitNestedField: true })
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createFieldDto: CreateFieldDto) {
    return this.fieldService.create(createFieldDto);
  }

  @ApiResponse(CreateFieldDto, { paginated: true, omitNestedField: true })
  @Public()
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.fieldService.findAll(query);
  }

  @ApiResponse(CreateFieldDto, { omitNestedField: true })
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fieldService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.fieldService.restore(restoreDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateFieldDto, { omitNestedField: true })
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() updateFieldDto: UpdateFieldDto) {
    return this.fieldService.update(id, updateFieldDto);
  }

  @ApiBearerAuth()
  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.fieldService.hardRemove(hardRemoveDto);
  }

  @ApiBearerAuth()
  @ApiResponse(CreateFieldDto, { omitNestedField: true })
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fieldService.remove(id);
  }
}
