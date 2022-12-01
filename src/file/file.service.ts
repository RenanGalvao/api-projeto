import { Injectable, Logger, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { FILES_PATH, TEMPLATE } from 'src/constants';
import { PrismaService } from 'src/prisma/prisma.service';
import { FileResponse } from 'src/utils';
import { PaginationDto } from 'src/prisma/dto';
import * as fs from 'fs';
import { File } from '@prisma/client';
import { RestoreDto, HardRemoveDto } from 'src/utils/dto';

@Injectable()
export class FileService {
  private readonly logger = new Logger(FileService.name);

  constructor(private prismaService: PrismaService) {}

  async create(file: Express.Multer.File) {
    await this.prismaService.file.create({
      data: {
        name: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      },
    });
    return {
      name: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    };
  }

  async bulkCreate(files: Express.Multer.File[]) {
    const filesObj = [];
    const returnObj: FileResponse[] = [];

    files.forEach(async (file) => {
      filesObj.push({
        name: file.filename,
        mimeType: file.mimetype,
        size: file.size,
      } as File);
      returnObj.push({
        name: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
      });
    });
    await this.prismaService.file.createMany({
      data: filesObj,
    });
    return returnObj;
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('file', query);
  }

  async findOne(id: string) {
    const file = await this.prismaService.file.findUnique({
      where: { id },
    });

    if (file) {
      return {
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        path: `${FILES_PATH}${file.name}`,
      };
    } else {
      return null;
    }
  }

  async remove(id: string) {
    try {
      const file = await this.prismaService.file.delete({
        where: { id },
      });

      return {
        name: file.name,
        mimeType: file.mimeType,
        size: file.size,
        path: `${FILES_PATH}${file.name}`,
      };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('arquivo', 'o'),
            data: {},
          });
        }
      }
      this.logger.error(error);
      return null;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.file.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    try {
      const filesQuery = this.prismaService.file.findMany({
        where: {
          id: { in: hardRemoveDto.ids },
        },
      });
      const deleteQuery = this.prismaService.file.deleteMany({
        where: {
          id: { in: hardRemoveDto.ids },
        },
      });
      const [files, result] = await this.prismaService.$transaction([
        filesQuery,
        deleteQuery,
      ]);

      for (const file of files) {
        fs.unlinkSync(`${FILES_PATH}${file.name}`);
      }
      return result;
    } catch (error) {
      this.logger.error(error);
      return null;
    }
  }
}
