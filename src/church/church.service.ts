import { Injectable, NotFoundException, Query } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { TEMPLATE } from 'src/constants';
import { PaginationDto } from 'src/prisma/dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { HardRemoveDto, RestoreDto } from 'src/utils';
import { CreateChurchDto, UpdateChurchDto } from './dto';

@Injectable()
export class ChurchService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createChurchDto: CreateChurchDto) {
    return await this.prismaService.church.create({
      data: {
        ...createChurchDto,
        field: {
          connect: {
            id: createChurchDto.field,
          },
        },
      },
    });
  }

  async findAll(@Query() query?: PaginationDto) {
    return await this.prismaService.paginatedQuery('church', query);
  }

  async findOne(id: string) {
    return await this.prismaService.church.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateChurchDto: UpdateChurchDto) {
    try {
      if (updateChurchDto.field) {
        updateChurchDto.field = {
          connect: { id: updateChurchDto.field },
        } as any;
      } else {
        delete updateChurchDto.field;
      }

      return await this.prismaService.church.update({
        where: { id },
        data: updateChurchDto as any,
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prismaService.church.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException({
            message: TEMPLATE.EXCEPTION.NOT_FOUND('igreja', 'a'),
            data: {},
          });
        }
      }
      throw error;
    }
  }

  async restore(restoreDto: RestoreDto) {
    return await this.prismaService.church.updateMany({
      data: {
        deleted: null,
      },
      where: {
        id: { in: restoreDto.ids },
      },
    });
  }

  async hardRemove(hardRemoveDto: HardRemoveDto) {
    const deleteQuery = this.prismaService.church.deleteMany({
      where: {
        id: { in: hardRemoveDto.ids },
      },
    });
    const [result] = await this.prismaService.$transaction([deleteQuery]);
    return result;
  }
}
