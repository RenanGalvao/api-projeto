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
import { MaxFilesSizeValidator } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';
import { Roles } from 'src/auth/roles';
import { Role } from '@prisma/client';

@ApiBearerAuth()
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

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

  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query() query?: PaginationDto) {
    return this.fileService.findAll(query);
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fileService.findOne(id);
  }

  @Roles(Role.ADMIN)
  @Put('restore')
  restore(@Body() restoreDto: RestoreDto) {
    return this.fileService.restore(restoreDto);
  }

  @Roles(Role.ADMIN)
  @Delete('hard-remove')
  hardRemove(@Body() hardRemoveDto: HardRemoveDto) {
    return this.fileService.hardRemove(hardRemoveDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fileService.remove(id);
  }
}
