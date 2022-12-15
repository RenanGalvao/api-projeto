import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  CacheTTL,
} from '@nestjs/common';
import { LogService } from './log.service';
import { PaginationDto } from 'src/prisma/dto';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';
import { ApiBatchResponse, ApiResponse } from 'src/utils';
import { CreateLogDto } from './dto';
import { CreateUserDto } from 'src/user/dto';

@ApiTags('Log')
@ApiExtraModels(CreateLogDto)
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('log')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @ApiResponse(CreateLogDto, {
    omitNestedField: true,
    paginated: true,
    extend: {
      key: 'user',
      value: {
        allOf: [
          { $ref: getSchemaPath(CreateUserDto) },
          {
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
              },
              deleted: {
                type: 'string',
                format: 'date-time',
                default: null,
              },
            },
          },
        ],
      },
    },
  })
  @CacheTTL(1)
  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.logService.findAll(query);
  }

  @ApiResponse(CreateLogDto, {
    omitNestedField: true,
    extend: {
      key: 'user',
      value: {
        allOf: [
          { $ref: getSchemaPath(CreateUserDto) },
          {
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
              },
              deleted: {
                type: 'string',
                format: 'date-time',
                default: null,
              },
            },
          },
        ],
      },
    },
  })
  @CacheTTL(1)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.logService.findOne(id);
  }

  @ApiBatchResponse()
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.logService.restore(restoreDto);
  }

  @ApiBatchResponse()
  @Delete('clean')
  clean() {
    return this.logService.clean();
  }

  @ApiBatchResponse()
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.logService.hardRemove(hardRemoveDto);
  }
}
