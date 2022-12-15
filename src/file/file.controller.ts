import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipeBuilder,
  HttpStatus,
  UnprocessableEntityException,
  UploadedFile,
  ParseFilePipe,
  Query,
  Put,
  Body,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { TEMPLATE, MAX_FILE_SIZE } from 'src/constants';
import {
  ApiBatchResponse,
  ApiCreatedResponse,
  ApiFile,
  ApiFiles,
  ApiResponse,
  MaxFilesSizeValidator,
} from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';
import { FileResponseDto } from './dto';

@ApiTags('File')
@ApiExtraModels(FileResponseDto)
@ApiBearerAuth()
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiFile()
  @ApiCreatedResponse(FileResponseDto, { omitNestedField: true })
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({
          maxSize: MAX_FILE_SIZE,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          exceptionFactory: () => {
            return new UnprocessableEntityException({
              message: TEMPLATE.EXCEPTION.FILE_SIZE_EXCEEDS(MAX_FILE_SIZE),
              data: {},
            });
          },
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.fileService.create(file);
  }

  @ApiFiles()
  @ApiCreatedResponse(FileResponseDto, {
    omitNestedField: true,
    paginated: true,
  })
  @Post('bulk')
  @UseInterceptors(FilesInterceptor('files'))
  bulkCreate(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFilesSizeValidator({
            maxSize: MAX_FILE_SIZE,
          }),
        ],
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        exceptionFactory: () => {
          return new UnprocessableEntityException({
            message: TEMPLATE.EXCEPTION.FILES_SIZE_EXCEEDS(MAX_FILE_SIZE),
            data: {},
          });
        },
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.fileService.bulkCreate(files);
  }

  @ApiResponse(FileResponseDto, { omitNestedField: true, paginated: true })
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.fileService.findAll(query);
  }

  @ApiResponse(FileResponseDto, { omitNestedField: true })
  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.fileService.restore(restoreDto);
  }

  @ApiBatchResponse()
  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.fileService.hardRemove(hardRemoveDto);
  }

  @ApiResponse(FileResponseDto, { omitNestedField: true })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fileService.remove(id);
  }
}
