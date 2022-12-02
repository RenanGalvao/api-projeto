import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateFieldDto, UpdateFieldDto } from './dto';

@Injectable()
export class FieldService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createFieldDto: CreateFieldDto) {
    return await this.prismaService.field.create({
      data: {
        ...createFieldDto,
        // got 99 problems, but types ain't one
        mapLocation: createFieldDto.mapLocation as Prisma.JsonObject,
        mapArea: createFieldDto.mapArea as Prisma.JsonObject[],
        collectionPoints: createFieldDto.collectionPoints as any[],
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('field', query);
  }

  async findOne(id: string) {
    return await this.prismaService.field.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateFieldDto: UpdateFieldDto) {
    try {
      return await this.prismaService.field.update({
        where: { id },
        data: {
          ...updateFieldDto,
          mapLocation: updateFieldDto.mapLocation as Prisma.JsonObject,
          mapArea: updateFieldDto.mapArea as Prisma.JsonObject[],
          collectionPoints: updateFieldDto.collectionPoints as any[],
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('campo', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.field.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('campo', 'o'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.field.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.field.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
